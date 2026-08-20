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

router.use(protect, authorize("SUPER_ADMIN"));

router.post("/", validate(createSupportRequirementSchema), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.patch(
  "/:id",
  validate(updateSupportRequirementSchema),
  controller.update
);
router.delete("/:id", controller.remove);

export default router;
