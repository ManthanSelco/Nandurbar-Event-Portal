import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import staffRoutes from "../modules/staff/staff.routes.js";
import participantRoutes from "../modules/participants/participant.routes.js";
import participantQuestionRoutes from "../modules/participants/participantQuestion.routes.js";
import vendorRoutes from "../modules/vendors/vendor.routes.js";
import governmentSchemeRoutes from "../modules/governmentSchemes/governmentScheme.routes.js";
import supportRequirementRoutes from "../modules/supportRequirements/supportRequirement.routes.js";
import whatsappRoutes from "../modules/whatsapp/whatsapp.routes.js";

const router = Router();

// Authentication
router.use("/auth", authRoutes);

// Staff management
router.use("/staff", staffRoutes);

// Participant registration
router.use("/participants", participantRoutes);

// Participant question management - Super Admin
router.use(
  "/participant-questions",
  participantQuestionRoutes
);


router.use("/vendors", vendorRoutes);
router.use("/government-schemes", governmentSchemeRoutes);
router.use("/support-requirements", supportRequirementRoutes);
router.use("/whatsapp", whatsappRoutes);

export default router;