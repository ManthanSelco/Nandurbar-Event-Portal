import { Router } from "express";

import staffController from "./staff.controller.js";
import validate from "../../middleware/validate.middleware.js";
import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";

import {
  createStaffSchema,
  updateStaffSchema,
  changeStatusSchema,
  resetPasswordSchema,
} from "./staff.validation.js";



const router = Router();

/**
 * Create Staff
 */
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  validate(createStaffSchema),
  staffController.createStaff
);

/**
 * Get All Staff
 */
router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  staffController.getAllStaff
);

/**
 * Get Staff By ID
 */
router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  staffController.getStaffById
);

/**
 * Update Staff
 */
router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  validate(updateStaffSchema),
  staffController.updateStaff
);

/**
 * Activate / Deactivate Staff
 */
router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN"),
  validate(changeStatusSchema),
  staffController.changeStatus
);

/**
 * Reset Password
 */
router.patch(
  "/:id/reset-password",
  protect,
  authorize("SUPER_ADMIN"),
  validate(resetPasswordSchema),
  staffController.resetPassword
);

/**
 * Soft Delete
 */
router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  staffController.deleteStaff
);

export default router;