import rateLimit from "express-rate-limit";

export const authRateLimiter =
  rateLimit({
    windowMs: 15 * 60 * 1000,

    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many authentication attempts. Please try again later.",
    },
  });

export const otpRateLimiter =
  rateLimit({
    windowMs: 10 * 60 * 1000,

    max: 5,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message:
        "Too many OTP requests. Please try again later.",
    },
  });