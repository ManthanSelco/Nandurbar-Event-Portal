import { Router } from "express";
import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";
import validate from "../../middleware/validate.middleware.js";
import controller from "./whatsapp.controller.js";
import {
  selectRequirementSchema,
  adminMessageSchema,
  bulkMessageSchema,
} from "./whatsapp.validation.js";

const router = Router();

/*
 * Meta webhook must stay public.
 */
router.get("/webhook", controller.verifyWebhook);
router.post("/webhook", controller.receiveWebhook);

/*
 * Admin portal controls.
 */
router.use(protect, authorize("SUPER_ADMIN"));

router.get("/requirements", controller.getRequirements);

router.post(
  "/participants/requirement",
  validate(selectRequirementSchema),
  controller.selectRequirement
);

router.post(
  "/participants/:participantId/send-requirement",
  validate(
    selectRequirementSchema.pick({
      requirementId: true,
    })
  ),
  controller.sendRequirementInformation
);

router.post(
  "/participants/:participantId/message",
  validate(adminMessageSchema),
  controller.sendMessage
);

router.post(
  "/bulk-send",
  validate(bulkMessageSchema),
  controller.bulkSend
);

router.get(
  "/participants/:participantId/interactions",
  controller.getInteractions
);

// Admin-only diagnostic: send the same approved TryowBot campaign used after registration.
router.post(
  "/participants/:participantId/send-post-event",
  controller.sendPostEventTemplate
);

router.post(
  "/participants/:participantId/test-welcome",
  controller.sendWelcomeTemplate
);

router.post(
  "/participants/:participantId/sync",
  controller.syncParticipantMessages
);

export default router;
