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
 * --------------------------------------------------------------------------
 * Meta Webhook
 * --------------------------------------------------------------------------
 * Webhook must stay public.
 */
router.get("/webhook", controller.verifyWebhook);
router.post("/webhook", controller.receiveWebhook);

/*
 * --------------------------------------------------------------------------
 * Staff + Super Admin
 * --------------------------------------------------------------------------
 * Staff and Super Admin can VIEW participant WhatsApp interactions
 * from the participant profile.
 */
router.get(
  "/participants/:participantId/interactions",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  controller.getInteractions
);

/*
 * --------------------------------------------------------------------------
 * Super Admin Only
 * --------------------------------------------------------------------------
 * All WhatsApp management/action routes below remain restricted
 * to Super Admin.
 */
router.use(
  protect,
  authorize("SUPER_ADMIN")
);

router.get(
  "/requirements",
  controller.getRequirements
);

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

// Admin-only diagnostic: send the approved TryowBot campaign.
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