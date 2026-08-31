import { Router } from "express";

import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";
import validate from "../../middleware/validate.middleware.js";

import controller from "./supportRequirement.controller.js";

import {
  createSupportRequirementSchema,
  updateSupportRequirementSchema,
} from "./supportRequirement.validation.js";

const router = Router();

/*
 * Requirements
 *
 * STAFF:
 * - Can view requirements
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
  controller.list
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  controller.getById
);

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  validate(createSupportRequirementSchema),
  controller.create
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  validate(updateSupportRequirementSchema),
  controller.update
);

router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  controller.remove
);

export default router;