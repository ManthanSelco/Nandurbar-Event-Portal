import express from "express";

import multer from "multer";

import vendorController from "./vendor.controller.js";

import protect from "../auth/auth.middleware.js";

import authorize from "../../middleware/authorize.middleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// View vendors — STAFF + SUPER_ADMIN
router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  vendorController.getVendors
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  vendorController.getVendorById
);

// Admin-only actions
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  vendorController.createVendor
);

router.post(
  "/import/csv",
  protect,
  authorize("SUPER_ADMIN"),
  upload.single("file"),
  vendorController.importCsv
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  vendorController.updateVendor
);

router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  vendorController.deleteVendor
);

router.post(
  "/:id/documents",
  protect,
  authorize("SUPER_ADMIN"),
  vendorController.addDocument
);

router.post(
  "/:id/links",
  protect,
  authorize("SUPER_ADMIN"),
  vendorController.addImportantLink
);

export default router;