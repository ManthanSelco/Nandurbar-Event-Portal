import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import authService from "./auth.service.js";

const signup = asyncHandler(async (req, res) => {
  const data =
    await authService.signup(req.body);

  return ApiResponse.success(
    res,
    "Account created. Please verify your email.",
    data
  );
});

const verifyEmail = asyncHandler(
  async (req, res) => {
    const data =
      await authService.verifyEmail(
        req.body
      );

    return ApiResponse.success(
      res,
      "Email verified successfully.",
      data
    );
  }
);

const resendVerification =
  asyncHandler(async (req, res) => {
    await authService.resendVerification(
      req.body.email
    );

    return ApiResponse.success(
      res,
      "If the account exists and is not verified, a verification OTP has been sent.",
      null
    );
  });

const login = asyncHandler(async (req, res) => {
  const data =
    await authService.login(req.body);

  return ApiResponse.success(
    res,
    "Login successful",
    data
  );
});

const changePassword =
  asyncHandler(async (req, res) => {
    await authService.changePassword({
      staffId: req.staff._id,
      currentPassword:
        req.body.currentPassword,
      newPassword:
        req.body.newPassword,
    });

    return ApiResponse.success(
      res,
      "Password changed successfully.",
      null
    );
  });

const forgotPassword =
  asyncHandler(async (req, res) => {
    await authService.forgotPassword(
      req.body.email
    );

    return ApiResponse.success(
      res,
      "If an account exists for this email, password reset instructions have been sent.",
      null
    );
  });

const verifyResetOtp =
  asyncHandler(async (req, res) => {
    const data =
      await authService.verifyResetOtp(
        req.body
      );

    return ApiResponse.success(
      res,
      "OTP verified successfully.",
      data
    );
  });

const resetPassword =
  asyncHandler(async (req, res) => {
    await authService.resetPassword(
      req.body
    );

    return ApiResponse.success(
      res,
      "Password reset successfully.",
      null
    );
  });



  

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