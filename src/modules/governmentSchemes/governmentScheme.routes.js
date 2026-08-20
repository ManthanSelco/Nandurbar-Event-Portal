import express from "express";
import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";

import governmentSchemeController from "./governmentScheme.controller.js";

const router = express.Router();

router.use(protect, authorize("SUPER_ADMIN"));

router.post(
  "/",
  governmentSchemeController.createScheme
);

router.get(
  "/",
  governmentSchemeController.getSchemes
);

router.get(
  "/:id",
  governmentSchemeController.getSchemeById
);

router.patch(
  "/:id",
  governmentSchemeController.updateScheme
);

router.delete(
  "/:id",
  governmentSchemeController.deleteScheme
);

export default router;