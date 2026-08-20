import crypto from "crypto";
import AuthToken from "./authToken.model.js";

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const generateOtp = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

const createOtp = async ({
  staffId,
  email,
  type,
}) => {
  const otp = generateOtp();

  await AuthToken.deleteMany({
    staffId,
    type,
    usedAt: null,
  });

  await AuthToken.create({
    staffId,
    email,
    type,
    tokenHash: hashToken(otp),
    expiresAt: new Date(
      Date.now() + 10 * 60 * 1000
    ),
  });

  return otp;
};

const verifyOtp = async ({
  staffId,
  otp,
  type,
}) => {
  const token = await AuthToken.findOne({
    staffId,
    type,
    tokenHash: hashToken(otp),
    usedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  });

  if (!token) {
    return false;
  }

  token.usedAt = new Date();

  await token.save();

  return true;
};

const createResetToken = async ({
  staffId,
  email,
}) => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  await AuthToken.deleteMany({
    staffId,
    type: "PASSWORD_RESET",
    usedAt: null,
  });

  await AuthToken.create({
    staffId,
    email,
    type: "PASSWORD_RESET",
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(
      Date.now() + 15 * 60 * 1000
    ),
  });

  return rawToken;
};

const consumeResetToken = async (token) => {
  const authToken = await AuthToken.findOne({
    type: "PASSWORD_RESET",
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  });

  if (!authToken) {
    return null;
  }

  authToken.usedAt = new Date();

  await authToken.save();

  return authToken;
};

export default {
  createOtp,
  verifyOtp,
  createResetToken,
  consumeResetToken,
};