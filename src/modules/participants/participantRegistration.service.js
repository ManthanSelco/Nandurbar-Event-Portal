import crypto from "crypto";

import ParticipantRegistration from "./participantRegistration.model.js";
import otpService from "../../shared/otp/otp.service.js";
import ApiError from "../../shared/errors/ApiError.js";

const OTP_PURPOSE = "PARTICIPANT_REGISTRATION";
const SESSION_DURATION = 30 * 60 * 1000;

const generateSessionToken = () =>
  crypto.randomBytes(32).toString("hex");

const sendOtp = async ({ mobile, countryCode = "+91" }) => {
  return otpService.sendOtp({
    mobile,
    countryCode,
    purpose: OTP_PURPOSE,
  });
};

const verifyOtp = async ({
  mobile,
  countryCode = "+91",
  otp,
}) => {
  await otpService.verifyOtp({
    mobile,
    countryCode,
    purpose: OTP_PURPOSE,
    otp,
  });

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await ParticipantRegistration.deleteMany({
    mobile,
    countryCode,
  });

  await ParticipantRegistration.create({
    mobile,
    countryCode,
    mobileVerified: true,
    sessionToken,
    expiresAt,
  });

  return {
    sessionToken,
    expiresAt,
    mobile,
    countryCode,
  };
};

const validateSession = async (sessionToken) => {
  if (!sessionToken) {
    throw new ApiError(
      401,
      "Registration session is required."
    );
  }

  const session = await ParticipantRegistration.findOne({
    sessionToken,
    mobileVerified: true,
  });

  if (!session) {
    throw new ApiError(
      401,
      "Invalid registration session."
    );
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await ParticipantRegistration.deleteOne({
      _id: session._id,
    });

    throw new ApiError(
      401,
      "Registration session has expired."
    );
  }

  return session;
};

const consumeSession = async (sessionId) => {
  await ParticipantRegistration.deleteOne({
    _id: sessionId,
  });
};

export default {
  sendOtp,
  verifyOtp,
  validateSession,
  consumeSession,
};
