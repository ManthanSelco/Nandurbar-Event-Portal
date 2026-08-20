import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import service from "./whatsapp.service.js";
import { syncMobile } from "./whatsapp.receive.worker.js";
import env from "../../config/env.js";

const getRequirements = asyncHandler(async (req, res) => {
  const data = await service.getRequirementOptions();
  return ApiResponse.success(
    res,
    "WhatsApp requirement options fetched successfully.",
    data
  );
});

const selectRequirement = asyncHandler(async (req, res) => {
  const data = await service.selectRequirement({
    participantId: req.body.participantId,
    requirementId: req.body.requirementId,
    message: req.body.message,
    method: "ADMIN",
  });

  return ApiResponse.success(
    res,
    "Participant requirement selected successfully.",
    data
  );
});

const sendRequirementInformation = asyncHandler(
  async (req, res) => {
    const data = await service.sendRequirementInformation({
      participantId: req.params.participantId,
      requirementId: req.body.requirementId,
    });

    return ApiResponse.success(
      res,
      "WhatsApp requirement information sent successfully.",
      data
    );
  }
);

const sendMessage = asyncHandler(async (req, res) => {
  const data = await service.sendAdminMessage({
    participantId: req.params.participantId,
    message: req.body.message,
    staffId: req.staff._id,
  });

  return ApiResponse.success(
    res,
    "WhatsApp message sent successfully.",
    data
  );
});

const bulkSend = asyncHandler(async (req, res) => {
  const data = await service.bulkSend({
    participantIds: req.body.participantIds,
    message: req.body.message,
    staffId: req.staff._id,
  });

  return ApiResponse.success(
    res,
    "WhatsApp bulk send completed.",
    data
  );
});

const sendPostEventTemplate = asyncHandler(async (req, res) => {
  const data = await service.sendPostEventTemplate({ participantId: req.params.participantId });
  return ApiResponse.success(res, "Post-event WhatsApp template sent successfully.", data);
});

const sendWelcomeTemplate = asyncHandler(async (req, res) => {
  const data = await service.sendWelcomeTemplate({
    participantId: req.params.participantId,
  });

  return ApiResponse.success(
    res,
    "WhatsApp welcome template sent successfully.",
    data
  );
});

const syncParticipantMessages = asyncHandler(async (req, res) => {
  const participant = await service.getParticipant(req.params.participantId);
  const mobile = `${String(participant.countryCode || "+91").replace("+", "")}${participant.mobile}`;
  const data = await syncMobile(mobile);

  return ApiResponse.success(
    res,
    "WhatsApp messages synchronized successfully.",
    data
  );
});

const getInteractions = asyncHandler(async (req, res) => {
  const data = await service.getParticipantInteractions(
    req.params.participantId
  );

  return ApiResponse.success(
    res,
    "WhatsApp interactions fetched successfully.",
    data
  );
});

const verifyWebhook = (req, res) => {
  if (env.whatsapp.provider === "gupshup") return res.sendStatus(200);
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

const receiveWebhook = asyncHandler(async (req, res) => {
  // Acknowledge Gupshup immediately. Conversation processing can involve MongoDB,
  // translation and a follow-up WhatsApp API call, so it should not block the webhook.
  res.sendStatus(200);
  void service.handleWebhookMessage(req.body).catch((error) => {
    console.error("[gupshup-webhook] processing failed:", error.message);
  });
});

export default {
  getRequirements,
  selectRequirement,
  sendRequirementInformation,
  sendMessage,
  bulkSend,
  getInteractions,
  sendWelcomeTemplate,
  sendPostEventTemplate,
  syncParticipantMessages,
  verifyWebhook,
  receiveWebhook,
};
