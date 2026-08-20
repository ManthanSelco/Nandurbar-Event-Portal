import crypto from "crypto";

export const generateOtp = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

export const hashOtp = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

export const getOtpExpiry = () => {
  // OTP valid for 10 minutes
  return new Date(Date.now() + 10 * 60 * 1000);
};