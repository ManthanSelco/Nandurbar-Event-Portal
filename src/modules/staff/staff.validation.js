import { z } from "zod";

const selcoEmailRegex =
  /^[a-zA-Z0-9._%+-]+@selcofoundation\.org$/;

/**
 * Create Staff
 */
export const createStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(100, "Name cannot exceed 100 characters"),

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
      .regex(
        /^\+\d{1,4}$/,
        "Invalid country code"
      )
      .default("+91"),

    mobile: z
      .string()
      .regex(
        /^[0-9]{10}$/,
        "Mobile number must contain exactly 10 digits"
      ),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(20, "Password cannot exceed 20 characters"),

    confirmPassword: z.string(),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );

/**
 * Update Staff
 */
export const updateStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        selcoEmailRegex,
        "Only SELCO Foundation email is allowed"
      )
      .optional(),

    countryCode: z
      .string()
      .regex(/^\+\d{1,4}$/)
      .optional(),

    mobile: z
      .string()
      .regex(
        /^[0-9]{10}$/,
        "Mobile number must contain exactly 10 digits"
      )
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required for update.",
    }
  );

/**
 * Activate / Deactivate Staff
 */
export const changeStatusSchema = z.object({
  isActive: z.boolean({
    required_error: "isActive is required",
  }),
});

/**
 * Reset Password
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(20, "Password cannot exceed 20 characters"),

    confirmPassword: z.string(),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }
  );