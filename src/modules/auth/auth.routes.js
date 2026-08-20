import { Router } from "express";

import authController from "./auth.controller.js";
import validate from "../../middleware/validate.middleware.js";
import protect from "./auth.middleware.js";

import {
  loginSchema,
  signupSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "./auth.validation.js";

import {
  authRateLimiter,
  otpRateLimiter,
} from "../../middleware/rateLimit.middleware.js";

const router = Router();

console.log("Auth Routes Loaded");

// =========================
// Staff Self Signup
// =========================

router.post(
  "/signup",
  authRateLimiter,
  validate(signupSchema),
  authController.signup
);

// =========================
// Email Verification
// =========================

router.post(
  "/verify-email",
  otpRateLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  "/resend-verification",
  otpRateLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

// =========================
// Login
// =========================

router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login
);

// =========================
// Change Password
// =========================

router.patch(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

// =========================
// Forgot Password
// =========================

router.post(
  "/forgot-password",
  otpRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// =========================
// Verify Reset OTP
// =========================

router.post(
  "/verify-reset-otp",
  otpRateLimiter,
  validate(verifyResetOtpSchema),
  authController.verifyResetOtp
);

// =========================
// Reset Password
// =========================

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;