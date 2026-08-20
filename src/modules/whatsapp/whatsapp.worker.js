import WhatsAppJob from "./whatsappJob.model.js";
import Participant from "../participants/participant.model.js";
import WhatsAppInteraction from "./whatsapp.model.js";
import whatsappProvider from "./whatsapp.provider.js";
import env from "../../config/env.js";

const MAX_ATTEMPTS = 5;
const POLL_MS = 1500;
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;

const phone = (participant) =>
  `${String(participant.countryCode || "+91").replace("+", "")}${participant.mobile}`;

const buildWelcomeComponents = (participant) => {
  const variables = env.whatsapp.welcomeTemplateVariables || [];
  if (!variables.length) return [];

  const values = {
    name: participant.name,
    participantName: participant.name,
    event: env.whatsapp.eventName || "Nandurbar Event",
  };

  return [
    {
      type: "body",
      parameters: variables.map((key) => ({
        type: "text",
        text: String(values[key] ?? ""),
      })),
    },
  ];
};

const processJob = async (job) => {
  console.log(`[whatsapp-worker] processing job=${job._id} participant=${job.participant}`);

  const participant = await Participant.findOne({
    _id: job.participant,
    isDeleted: false,
  }).lean();

  if (!participant || !participant.mobile || !participant.whatsappAvailable) {
    await WhatsAppJob.updateOne(
      { _id: job._id },
      { $set: { status: "FAILED", lastError: "Participant has no WhatsApp-enabled mobile number." } }
    );
    return;
  }

 const language = participant.preferredLanguage || "mr";

const templateName =
  env.whatsapp.welcomeTemplateNames?.[language] ||
  env.whatsapp.welcomeTemplateName;

const templateId = env.whatsapp.gupshupWelcomeTemplateId;

if (env.whatsapp.provider === "gupshup" && !templateId) {
  throw new Error("GUPSHUP_WELCOME_TEMPLATE_ID is not configured.");
}
 console.log(
  `[whatsapp-worker] sending welcome to=${phone(participant)} language=${language} template=${templateName}`
);

  const interaction = await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "OUTBOUND",
    method: "SYSTEM",
    messageType: "TEMPLATE",
    queryType: "OTHER",
    message: `Welcome template: ${templateName}`,
    status: "PENDING",
  metadata: {
  templateName,
  language,
  provider: env.whatsapp.provider,
  jobId: String(job._id),
},
  });

  try {

   const result = await whatsappProvider.sendTemplate({
  to: phone(participant),
  templateName,
   templateId,
   languageCode: language,
  components: buildWelcomeComponents(participant),
});

    interaction.status = "SENT";
    interaction.providerMessageId = result.providerMessageId;
    interaction.sentAt = new Date();
    await interaction.save();

    await WhatsAppJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "SENT",
          providerMessageId: result.providerMessageId,
          lastError: null,
        },
      }
    );

    await Participant.updateOne(
      { _id: participant._id },
      {
        $set: {
          whatsappStatus: "CONTACTED",
          participantStatus: "REGISTERED",
          postEventStep: participant.postEventStep && participant.postEventStep !== "NONE" ? participant.postEventStep : "LIVELIHOOD",
          followUpRequired: true,
        },
      }
    );
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;
    await interaction.save();

    const attempts = Number(job.attempts || 0) + 1;
    const failed = attempts >= MAX_ATTEMPTS;
    const delay = Math.min(60_000 * 2 ** Math.max(attempts - 1, 0), 30 * 60_000);

    await WhatsAppJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: failed ? "FAILED" : "QUEUED",
          attempts,
          nextAttemptAt: new Date(Date.now() + delay),
          lastError: error.message,
          lockedAt: null,
        },
      }
    );

    console.error(
      `[whatsapp-worker] failed job=${job._id} attempt=${attempts}/${MAX_ATTEMPTS}: ${error.message}`
    );

    if (failed) {
      await Participant.updateOne(
        { _id: participant._id },
        { $set: { whatsappStatus: "FAILED" } }
      );
    }
  }
};

const claimJob = async () => {
  const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);

  return WhatsAppJob.findOneAndUpdate(
    {
      $or: [
        { status: "QUEUED", nextAttemptAt: { $lte: new Date() } },
        { status: "PROCESSING", lockedAt: { $lte: staleBefore } },
      ],
    },
    {
      $set: { status: "PROCESSING", lockedAt: new Date() },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" }
  );
};

let timer = null;
let running = false;

const startWhatsAppWorker = () => {
  if (timer || !env.whatsapp.enabled) return;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const job = await claimJob();
      if (job) await processJob(job);
    } catch (error) {
      console.error("[whatsapp-worker]", error.message);
    } finally {
      running = false;
    }
  };

  // Run once immediately so a registration does not have to wait for the
  // first interval after server startup.
  run();
  timer = setInterval(run, POLL_MS);

  timer.unref?.();
  console.log("[whatsapp-worker] started");
};

export default { startWhatsAppWorker };
