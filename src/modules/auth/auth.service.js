import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Staff from "../staff/staff.model.js";
import ApiError from "../../shared/errors/ApiError.js";
import env from "../../config/env.js";

import authTokenService from "./authToken.service.js";
import emailService from "../../services/email.service.js";

const generateToken = (staff) => {
  return jwt.sign(
    {
      id: staff._id,
      role: staff.role,
    },
    env.jwtSecret,
    {
      expiresIn: "1d",
    }
  );
};

const signup = async (payload) => {
  const {
    name,
    email,
    mobile,
    countryCode,
    password,
  } = payload;

  const normalizedEmail = email
    .toLowerCase()
    .trim();

  const existingEmail = await Staff.findOne({
    email: normalizedEmail,
    isDeleted: false,
  });

  if (existingEmail) {
    throw new ApiError(
      409,
      "An account with this email already exists."
    );
  }

  const existingMobile = await Staff.findOne({
    mobile,
    isDeleted: false,
  });

  if (existingMobile) {
    throw new ApiError(
      409,
      "Mobile number already exists."
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    12
  );

  const staff = await Staff.create({
    name,
    email: normalizedEmail,
    mobile,
    countryCode,
    password: hashedPassword,

    role: "STAFF",

    isActive: true,
    isDeleted: false,

    // SELF SIGNUP
    emailVerified: false,
    emailVerifiedAt: null,
  });

  const otp = await authTokenService.createOtp({
    staffId: staff._id,
    email: staff.email,
    type: "EMAIL_VERIFICATION",
  });

  await emailService.sendEmail({
    to: staff.email,
    subject: "Verify your SELCO Foundation account",
    html: `
      <h2>Email Verification</h2>

      <p>Hello ${staff.name},</p>

      <p>Your verification OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP will expire in 10 minutes.</p>

      <p>If you did not create this account, please ignore this email.</p>
    `,
  });

  return {
    _id: staff._id,
    name: staff.name,
    email: staff.email,
    mobile: staff.mobile,
    countryCode: staff.countryCode,
    role: staff.role,
    emailVerified: staff.emailVerified,
  };
};

const verifyEmail = async ({
  email,
  otp,
}) => {
  const staff = await Staff.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  });

  if (!staff) {
    throw new ApiError(
      400,
      "Invalid verification request."
    );
  }

  if (staff.emailVerified) {
    throw new ApiError(
      400,
      "Email is already verified."
    );
  }

  const verified =
    await authTokenService.verifyOtp({
      staffId: staff._id,
      otp,
      type: "EMAIL_VERIFICATION",
    });

  if (!verified) {
    throw new ApiError(
      400,
      "Invalid or expired OTP."
    );
  }

  staff.emailVerified = true;
  staff.emailVerifiedAt = new Date();

  await staff.save();

  return {
    email: staff.email,
    emailVerified: true,
  };
};

const resendVerification = async (email) => {
  const staff = await Staff.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  });

  if (!staff) {
    return;
  }

  if (staff.emailVerified) {
    throw new ApiError(
      400,
      "Email is already verified."
    );
  }

  const otp = await authTokenService.createOtp({
    staffId: staff._id,
    email: staff.email,
    type: "EMAIL_VERIFICATION",
  });

  await emailService.sendEmail({
    to: staff.email,
    subject: "Your new verification OTP",
    html: `
      <h2>Email Verification</h2>

      <p>Your new OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP expires in 10 minutes.</p>
    `,
  });
};

const login = async ({
  email,
  password,
}) => {
  const staff = await Staff.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  }).select("+password");

  if (!staff) {
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  const passwordMatch =
    await bcrypt.compare(
      password,
      staff.password
    );

  if (!passwordMatch) {
    throw new ApiError(
      401,
      "Invalid email or password."
    );
  }

  if (!staff.isActive) {
    throw new ApiError(
      403,
      "Staff account is inactive."
    );
  }

  if (!staff.emailVerified) {
    throw new ApiError(
      403,
      "Please verify your email before logging in."
    );
  }

  staff.lastLogin = new Date();

  await staff.save();

  const token = generateToken(staff);

  const staffResponse =
    staff.toObject();

  delete staffResponse.password;
  delete staffResponse.__v;

  return {
    staff: staffResponse,
    token,
  };
};

const changePassword = async ({
  staffId,
  currentPassword,
  newPassword,
}) => {
  const staff = await Staff.findById(
    staffId
  ).select("+password");

  if (!staff || staff.isDeleted) {
    throw new ApiError(
      404,
      "Staff not found."
    );
  }

  const valid =
    await bcrypt.compare(
      currentPassword,
      staff.password
    );

  if (!valid) {
    throw new ApiError(
      400,
      "Current password is incorrect."
    );
  }

  staff.password =
    await bcrypt.hash(
      newPassword,
      12
    );

  await staff.save();

  return null;
};

const forgotPassword = async (email) => {
  const staff = await Staff.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  });

  // Never expose whether account exists
  if (!staff) {
    return;
  }

  const otp =
    await authTokenService.createOtp({
      staffId: staff._id,
      email: staff.email,
      type: "PASSWORD_RESET",
    });

  const resetToken =
    await authTokenService.createResetToken({
      staffId: staff._id,
      email: staff.email,
    });

  const resetLink =
    `${env.frontendUrl || process.env.FRONTEND_URL}` +
    `/reset-password?token=${resetToken}`;

  await emailService.sendEmail({
    to: staff.email,
    subject: "Reset your SELCO Foundation password",
    html: `
      <h2>Password Reset</h2>

      <p>Your password reset OTP is:</p>

      <h1>${otp}</h1>

      <p>This OTP expires in 10 minutes.</p>

      <p>You can also reset your password using this link:</p>

      <a href="${resetLink}">
        Reset Password
      </a>

      <p>The reset link expires in 15 minutes.</p>
    `,
  });
};

const verifyResetOtp = async ({
  email,
  otp,
}) => {
  const staff = await Staff.findOne({
    email: email.toLowerCase().trim(),
    isDeleted: false,
  });

  if (!staff) {
    throw new ApiError(
      400,
      "Invalid or expired OTP."
    );
  }

  const valid =
    await authTokenService.verifyOtp({
      staffId: staff._id,
      otp,
      type: "PASSWORD_RESET",
    });

  if (!valid) {
    throw new ApiError(
      400,
      "Invalid or expired OTP."
    );
  }

  return {
    verified: true,
  };
};

const resetPassword = async ({
  token,
  password,
}) => {
  const authToken =
    await authTokenService.consumeResetToken(
      token
    );

  if (!authToken) {
    throw new ApiError(
      400,
      "Invalid or expired reset link."
    );
  }

  const staff = await Staff.findById(
    authToken.staffId
  ).select("+password");

  if (!staff || staff.isDeleted) {
    throw new ApiError(
      404,
      "Staff not found."
    );
  }

  staff.password =
    await bcrypt.hash(
      password,
      12
    );

  await staff.save();

  return null;
};

export default {
  signup,
  verifyEmail,
  resendVerification,
  login,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};