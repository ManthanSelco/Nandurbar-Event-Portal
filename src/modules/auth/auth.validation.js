import { z } from "zod";

const selcoEmailRegex =
  /^[a-zA-Z0-9._%+-]+@selcofoundation\.org$/;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email(),

  password: z
    .string()
    .min(6),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(100),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        selcoEmailRegex,
        "Only SELCO Foundation email is allowed"
      ),

    countryCode: z
      .string()
      .regex(/^\+\d{1,4}$/)
      .default("+91"),

    mobile: z
      .string()
      .regex(
        /^[0-9]{10}$/,
        "Mobile number must contain exactly 10 digits"
      ),

    password: z
      .string()
      .min(8)
      .max(20),

    confirmPassword: z.string(),
  })
  .refine(
    (data) =>
      data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );

export const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email(),

  otp: z
    .string()
    .regex(/^[0-9]{6}$/),
});

export const resendVerificationSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(),
  });

export const changePasswordSchema =
  z
    .object({
      currentPassword: z.string().min(1),

      newPassword: z
        .string()
        .min(8)
        .max(20),

      confirmPassword: z.string(),
    })
    .refine(
      (data) =>
        data.newPassword ===
        data.confirmPassword,
      {
        path: ["confirmPassword"],
        message: "Passwords do not match",
      }
    );

export const forgotPasswordSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(),
  });

export const verifyResetOtpSchema =
  z.object({
    email: z
      .string()
      .trim()
      .email(),

    otp: z
      .string()
      .regex(/^[0-9]{6}$/),
  });

export const resetPasswordSchema =
  z
    .object({
      token: z.string().min(20),

      password: z
        .string()
        .min(8)
        .max(20),

      confirmPassword: z.string(),
    })
    .refine(
      (data) =>
        data.password ===
        data.confirmPassword,
      {
        path: ["confirmPassword"],
        message: "Passwords do not match",
      }
    );