import crypto from "crypto";
import Participant from "../participants/participant.model.js";
import WhatsAppInteraction from "./whatsapp.model.js";
import whatsappProvider from "./whatsapp.provider.js";
import whatsappService from "./whatsapp.service.js";
import env from "../../config/env.js";

const POLL_MS = env.whatsapp.pollIntervalMs;
const MAX_PAGES = 4;

const formatDate = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

const messageKey = (item) =>
  crypto
    .createHash("sha256")
    .update(
      [
        item?.PhoneNumber || "",
        item?.CreatedAt || "",
        item?.MessageType || "",
        item?.Message || "",
        item?.HeaderImage || "",
        item?.HeaderVideo || "",
        item?.HeaderAudio || "",
        item?.HeaderDoc || "",
        item?.HeaderLocation || "",
      ].join("|")
    )
    .digest("hex");

const extractMessageText = (item) => {
  if (item?.Message) return String(item.Message).trim();
  if (item?.CaptionText) return String(item.CaptionText).trim();
  if (item?.HeaderLocation) return `[Location] ${item.HeaderLocation}`;
  if (item?.HeaderImage) return "[Image received]";
  if (item?.HeaderVideo) return "[Video received]";
  if (item?.HeaderAudio) return "[Audio received]";
  if (item?.HeaderDoc) return "[Document received]";
  return "";
};

const syncMobile = async (mobile) => {
  const normalizedMobile = String(mobile || "").replace(/\D/g, "");
  if (!normalizedMobile) return { received: 0, stored: 0 };

  const start = new Date();
  start.setDate(start.getDate() - env.whatsapp.receiveLookbackDays);

  let skip = 0;
  let received = 0;
  let stored = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await whatsappProvider.receiveMessages({
      mobile: normalizedMobile,
      startDate: formatDate(start),
      endDate: formatDate(new Date()),
      limit: env.whatsapp.receiveLimit,
      skip,
    });

    const rows = Array.isArray(result?.data) ? result.data : [];
    received += rows.length;

    for (const row of rows) {
      const key = messageKey(row);
      const from = String(row?.PhoneNumber || normalizedMobile).replace(/\D/g, "");
      const participant = await Participant.findOne({
        mobile: from.slice(-10),
        isDeleted: false,
      });

      if (!participant) continue;

      const text = extractMessageText(row);
      const existing = await WhatsAppInteraction.findOne({
        externalMessageKey: key,
      }).select("_id");

      if (existing) continue;

      const status = whatsappService.classifyParticipantResponse(text);

      await WhatsAppInteraction.create({
        participant: participant._id,
        mobile: participant.mobile,
        direction: "INBOUND",
        method: "WEBHOOK",
        messageType: String(row?.MessageType || "TEXT").toUpperCase() === "TEXT" ? "TEXT" : "TEXT",
        queryType: "SUPPORT_REQUEST",
        message: text,
        status: "RECEIVED",
        providerMessageId: row?.MessageId || row?.Id || null,
        externalMessageKey: key,
        metadata: row,
      });

      participant.whatsappStatus = "ACTIVE";
      participant.lastWhatsAppInteractionAt = new Date();
      participant.participantStatus = status;
      participant.followUpRequired = status !== "PROBLEM_SOLVED";
      await participant.save();

      // If the participant replies with an exact configured requirement name or keyword,
      // store the requirement match. TryowBot only sends approved API Campaign templates,
      // so no free-text reply is attempted here.
      await whatsappService.matchRequirementFromMessage({
        participantId: participant._id,
        text,
      });

      stored += 1;
    }

    if (rows.length < env.whatsapp.receiveLimit) break;
    skip += rows.length;
  }

  return { received, stored };
};

const startReceiveWorker = () => {
  if (!env.whatsapp.enabled || env.whatsapp.provider !== "tryowbot" || !env.whatsapp.receiveEnabled) {
    return;
  }

  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      if (env.whatsapp.receiveMobile) {
        const result = await syncMobile(env.whatsapp.receiveMobile);
        if (result.received) {
          console.log(`[whatsapp-receive] ${JSON.stringify(result)}`);
        }
      } else if (env.whatsapp.receiveAllParticipants) {
        // TryowBot receive API is mobile-scoped. Rotate through a bounded
        // batch of participants so replies can update status without requiring
        // a single hard-coded test number.
        const participants = await Participant.find({
          isDeleted: false,
          mobile: { $type: "string", $ne: "" },
          whatsappAvailable: true,
        })
          .sort({ lastWhatsAppInteractionAt: 1, createdAt: 1 })
          .limit(env.whatsapp.receiveBatchSize)
          .select("mobile")
          .lean();

        for (const participant of participants) {
          try {
            await syncMobile(participant.mobile);
          } catch (error) {
            console.error(
              `[whatsapp-receive] mobile ${participant.mobile}: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      console.error("[whatsapp-receive]", error.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, POLL_MS);
  timer.unref?.();
  run();

  console.log(`[whatsapp-receive] started (every ${POLL_MS}ms)`);
};
export { syncMobile };
export default { startReceiveWorker };
