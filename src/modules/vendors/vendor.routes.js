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

router.use(protect, authorize("SUPER_ADMIN"));

router.post("/", vendorController.createVendor);

router.post(
  "/import/csv",
  upload.single("file"),
  vendorController.importCsv
);

router.get("/", vendorController.getVendors);

router.get("/:id", vendorController.getVendorById);

router.patch("/:id", vendorController.updateVendor);

router.delete("/:id", vendorController.deleteVendor);

router.post(
  "/:id/documents",
  vendorController.addDocument
);

router.post(
  "/:id/links",
  vendorController.addImportantLink
);

export default router;