import Otp from "./otp.model.js";
import otpProvider from "./otp.provider.js";

import {
  generateOtp,
  hashOtp,
  getOtpExpiry,
} from "./otp.utils.js";

import ApiError from "../errors/ApiError.js";

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60 * 1000;

/**
 * Send OTP
 */
const sendOtp = async ({
  mobile,
  countryCode = "+91",
  purpose,
}) => {
  if (!mobile) {
    throw new ApiError(400, "Mobile number is required.");
  }

  if (!purpose) {
    throw new ApiError(400, "OTP purpose is required.");
  }

  // Find latest unverified OTP
  const existingOtp = await Otp.findOne({
    mobile,
    countryCode,
    purpose,
    verified: false,
  }).sort({ createdAt: -1 });

  // Prevent OTP spam
  if (
    existingOtp &&
    Date.now() - new Date(existingOtp.createdAt).getTime() <
      RESEND_COOLDOWN
  ) {
    throw new ApiError(
      429,
      "Please wait before requesting another OTP."
    );
  }

  // Delete previous unverified OTPs
  await Otp.deleteMany({
    mobile,
    countryCode,
    purpose,
    verified: false,
  });

  // Generate new OTP
  const otp = generateOtp();

  // Hash OTP before saving
  const otpHash = hashOtp(otp);

  // Save OTP
  await Otp.create({
    mobile,
    countryCode,
    otpHash,
    purpose,
    expiresAt: getOtpExpiry(),
    attempts: 0,
    verified: false,
  });

  // Send OTP through 2Factor
  await otpProvider.sendOtpSms({
    mobile,
    countryCode,
    otp,
  });

  // Development log
  console.log(
    `📱 OTP for ${countryCode}${mobile}: ${otp}`
  );

  return {
    message: "OTP sent successfully.",
  };
};

/**
 * Verify OTP
 */
const verifyOtp = async ({
  mobile,
  countryCode = "+91",
  purpose,
  otp,
}) => {
  if (!otp) {
    throw new ApiError(400, "OTP is required.");
  }

  const otpRecord = await Otp.findOne({
    mobile,
    countryCode,
    purpose,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new ApiError(
      400,
      "OTP is invalid or expired."
    );
  }

  // Check expiry
  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    throw new ApiError(
      400,
      "OTP has expired."
    );
  }

  // Check maximum attempts
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    throw new ApiError(
      429,
      "Too many incorrect OTP attempts."
    );
  }

  // Compare hashes
  const incomingHash = hashOtp(otp);

  if (incomingHash !== otpRecord.otpHash) {
    otpRecord.attempts += 1;

    await otpRecord.save();

    throw new ApiError(
      400,
      "Invalid OTP."
    );
  }

  // OTP verified
  otpRecord.verified = true;

  await otpRecord.save();

  return {
    verified: true,
    message: "Mobile number verified successfully.",
  };
};

/**
 * Check whether mobile has verified OTP
 */
const isOtpVerified = async ({
  mobile,
  countryCode = "+91",
  purpose,
}) => {
  const record = await Otp.findOne({
    mobile,
    countryCode,
    purpose,
    verified: true,
  }).sort({ createdAt: -1 });

  return Boolean(record);
};

export default {
  sendOtp,
  verifyOtp,
  isOtpVerified,
};