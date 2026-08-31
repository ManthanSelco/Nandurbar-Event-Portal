import express from "express";

import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";

import governmentSchemeController from "./governmentScheme.controller.js";

const router = express.Router();

/*
 * Government Schemes
 *
 * STAFF:
 * - Can view schemes
 *
 * SUPER_ADMIN:
 * - Can view
 * - Can create
 * - Can update
 * - Can delete
 */

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  governmentSchemeController.getSchemes
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  governmentSchemeController.getSchemeById
);

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  governmentSchemeController.createScheme
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  governmentSchemeController.updateScheme
);

router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  governmentSchemeController.deleteScheme
);

export default router;