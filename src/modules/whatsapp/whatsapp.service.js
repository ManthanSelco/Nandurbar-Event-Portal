import mongoose from "mongoose";
import Participant from "../participants/participant.model.js";
import SupportRequirement from "../supportRequirements/supportRequirement.model.js";
import Vendor from "../vendors/vendor.model.js";
import GovernmentScheme from "../governmentSchemes/governmentScheme.model.js";
import WhatsAppInteraction from "./whatsapp.model.js";
import whatsappProvider from "./whatsapp.provider.js";
import ApiError from "../../shared/errors/ApiError.js";
import env from "../../config/env.js";
import googleTranslation from "../../shared/translation/googleTranslation.service.js";

/* =========================================================
 * HELPERS
 * ========================================================= */

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const normalizeDigits = (value = "") =>
  String(value)
    // Devanagari digits: ०१२३४५६७८९
    .replace(/[०-९]/g, (digit) =>
      String("०१२३४५६७८९".indexOf(digit))
    )
    // Gujarati digits: ૦૧૨૩૪૫૬૭૮૯
    .replace(/[૦-૯]/g, (digit) =>
      String("૦૧૨૩૪૫૬૭૮૯".indexOf(digit))
    );

const normalizeChoiceText = (value = "") =>
  normalize(normalizeDigits(value));

const getWhatsAppNumber = (participant) =>
  `${String(participant.countryCode || "+91").replace(
    "+",
    ""
  )}${String(participant.mobile || "").replace(/\D/g, "")}`;

const classifyParticipantResponse = (text = "") => {
  const value = normalize(text);

  const solved = [
    "problem solved",
    "issue solved",
    "solved",
    "resolved",
    "समस्या हल",
    "समस्या सुटली",
    "प्रॉब्लेम सॉल्व",
    "समस्या सोडवली",
    "સમસ્યા ઉકેલાઈ",
    "સમસ્યા ઉકેલી",
    "ઉકેલાઈ",
  ];

  const progress = [
    "in progress",
    "working",
    "work in progress",
    "under process",
    "प्रक्रिया में",
    "काम सुरू",
    "काम चालू",
    "प्रगतीत",
    "પ્રક્રિયામાં",
    "કામ ચાલુ",
    "પ્રગતિમાં",
  ];

  if (
    solved.some((item) =>
      value.includes(normalize(item))
    )
  ) {
    return "PROBLEM_SOLVED";
  }

  if (
    progress.some((item) =>
      value.includes(normalize(item))
    )
  ) {
    return "IN_PROGRESS";
  }

  return "QUERY_RAISED";
};

/* =========================================================
 * PARTICIPANT
 * ========================================================= */

const getParticipant = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid participant ID.");
  }

  const participant = await Participant.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!participant) {
    throw new ApiError(404, "Participant not found.");
  }

  if (
    !participant.mobile ||
    !participant.whatsappAvailable
  ) {
    throw new ApiError(
      400,
      "Participant does not have an available WhatsApp mobile number."
    );
  }

  return participant;
};

/* =========================================================
 * WEBHOOK STATUS
 * ========================================================= */

const handleWebhookStatuses = async (statuses = []) => {
  for (const status of statuses) {
    const providerMessageId = status?.id;

    if (!providerMessageId) continue;

    const mapped = {
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
    }[String(status?.status || "").toLowerCase()];

    if (!mapped) continue;

    const interaction =
      await WhatsAppInteraction.findOneAndUpdate(
        { providerMessageId },
        {
          $set: {
            status: mapped,
            ...(mapped === "SENT"
              ? { sentAt: new Date() }
              : {}),
            ...(mapped === "FAILED"
              ? {
                  errorMessage:
                    status?.errors?.[0]?.title ||
                    status?.errors?.[0]?.message ||
                    "WhatsApp delivery failed.",
                }
              : {}),
          },
        },
        { new: true }
      );

    if (!interaction?.participant) continue;

    await Participant.updateOne(
      { _id: interaction.participant },
      {
        $set: {
          whatsappStatus:
            mapped === "FAILED" ? "FAILED" : "ACTIVE",
          lastWhatsAppInteractionAt: new Date(),
        },
      }
    );
  }
};

/* =========================================================
 * REQUIREMENTS
 * ========================================================= */

const getRequirementOptions = async () =>
  SupportRequirement.find({
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

const findMatches = async (requirement) => {
  const names = [
    requirement.name,
    ...(requirement.keywords || []),
  ]
    .map(normalize)
    .filter(Boolean);

  if (!names.length) {
    return {
      vendors: [],
      governmentSchemes: [],
    };
  }

  const regexes = names.map(
    (name) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
  );

  const vendorFilter = {
    status: "ACTIVE",
    $or: [
      { valueChain: { $in: regexes } },
      { secondaryValueChain: { $in: regexes } },
      {
        "relatedFields.interests": {
          $in: regexes,
        },
      },
    ],
  };

  const schemeFilter = {
    status: "ACTIVE",
    isDeleted: false,
    $or: [
      { category: { $in: regexes } },
      {
        "relatedFields.interests": {
          $in: regexes,
        },
      },
    ],
  };

  const [vendors, governmentSchemes] =
    await Promise.all([
      Vendor.find(vendorFilter)
        .limit(20)
        .lean(),

      GovernmentScheme.find(schemeFilter)
        .limit(20)
        .lean(),
    ]);

  return {
    vendors,
    governmentSchemes,
  };
};

/* =========================================================
 * LOCALIZATION
 * ========================================================= */

const localized = async (participant, text) => {
  const language =
    participant.preferredLanguage || "mr";

  if (language === "en") {
    return text;
  }

  try {
    const [translated] =
      await googleTranslation.translateTexts(
        [text],
        language
      );

    return translated || text;
  } catch {
    return text;
  }
};

/* =========================================================
 * POST EVENT OPTIONS
 * ========================================================= */

const POST_EVENT_OPTIONS = {
  livelihood: {
    AGRICULTURE: "Agriculture",
    ANIMAL_HUSBANDRY: "Animal Husbandry",
    MICRO_BUSINESS:
      "Micro-business / small business",
    OTHER: "Other",
  },

  support: {
    TECHNOLOGY_MACHINERY:
      "Technology / machinery",
    SOLAR_ENERGY:
      "Solar / energy solutions",
    PRODUCT_DEVELOPMENT:
      "Product development",
    BRANDING_MARKETING:
      "Branding & marketing",
    PACKAGING: "Packaging",
    FINANCING: "Financing",
    TRAINING: "Training",
    MARKET_LINKAGE: "Market linkage",
    OTHER: "Other",
  },

  nextAction: {
    UNDERSTAND_SOLUTION:
      "Understand the solution better",
    SPEAK_TO_PROVIDER:
      "Speak to the solution provider",
    GET_COST_ESTIMATE:
      "Get a cost estimate",
    EXPLORE_FINANCING:
      "Explore financing options",
    DISCUSS_IMPLEMENTATION:
      "Discuss implementation",
    OTHER: "Other",
  },

  useful: {
    TECHNOLOGIES_MACHINERY:
      "Technologies / machinery showcased",
    SOLAR_ENERGY:
      "Solar / energy solutions",
    SOLUTION_PROVIDERS:
      "Interaction with solution providers",
    SPEAKERS_SESSIONS:
      "Speakers / sessions",
    DEMONSTRATIONS:
      "Demonstrations",
    FINANCING_SUPPORT:
      "Information on financing / support",
    NETWORKING:
      "Networking with other participants",
    OTHER: "Other",
  },
};

/* =========================================================
 * MATCH CHOICE
 * ========================================================= */

const matchChoice = async (
  participant,
  text,
  options
) => {
  const normalized = normalizeChoiceText(text);

  if (!normalized) return null;

  const entries = Object.entries(options);

  /*
   * Supports:
   * 1
   * 1,2
   * 1, 2
   * 1/2
   * 1 and 2
   * 1 & 2
   * Marathi: १,२
   * Gujarati: ૧,૨
   */

  const parts = normalized
    .split(/[,/|]+|\s+(?:and|&)\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);

  const numericParts = parts.map((item) =>
    Number.parseInt(item, 10)
  );

  const allNumeric =
    parts.length > 1 &&
    numericParts.length === parts.length &&
    numericParts.every(
      (num) =>
        Number.isInteger(num) &&
        num >= 1 &&
        num <= entries.length
    );

  if (allNumeric) {
    return numericParts.map(
      (num) => entries[num - 1][0]
    );
  }

  const numeric = Number.parseInt(
    normalized,
    10
  );

  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= entries.length &&
    String(numeric) === normalized
  ) {
    return entries[numeric - 1][0];
  }

  const labels = entries.map(([, label]) => label);

  let localizedLabels = labels;

  try {
    const translated =
      await googleTranslation.translateTexts(
        labels,
        participant.preferredLanguage || "mr"
      );

    if (Array.isArray(translated)) {
      localizedLabels = translated;
    }
  } catch {
    localizedLabels = labels;
  }

  for (let i = 0; i < entries.length; i += 1) {
    const [key, english] = entries[i];

    const candidates = [
      english,
      localizedLabels[i] || english,
      key.replaceAll("_", " "),
    ].map(normalizeChoiceText);

    if (
      candidates.some(
        (candidate) =>
          candidate === normalized ||
          candidate.includes(normalized) ||
          normalized.includes(candidate)
      )
    ) {
      return key;
    }
  }

  return null;
};

/* =========================================================
 * SEND TEXT
 * ========================================================= */

const sendLocalizedText = async ({
  participant,
  body,
  messageType = "TEXT",
  queryType = "INFORMATION_REQUEST",
  metadata = {},
}) => {
  const interaction =
    await WhatsAppInteraction.create({
      participant: participant._id,
      mobile: participant.mobile,
      direction: "OUTBOUND",
      method: "BOT",
      messageType,
      queryType,
      message: body,
      status: "PENDING",
      metadata: {
        ...metadata,
        language:
          participant.preferredLanguage || "mr",
      },
    });

  try {
    const providerResult =
      await whatsappProvider.sendText({
        to: getWhatsAppNumber(participant),
        body,
      });

    interaction.status = "SENT";
    interaction.providerMessageId =
      providerResult.providerMessageId;
    interaction.sentAt = new Date();
    interaction.metadata = {
      ...interaction.metadata,
      providerResponse: providerResult.raw,
    };

    await interaction.save();

    return interaction;
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;

    await interaction.save();

    throw error;
  }
};

/* =========================================================
 * WELCOME TEMPLATE
 * ========================================================= */

const sendWelcomeTemplate = async ({
  participantId,
}) => {
  const participant =
    await getParticipant(participantId);

  const language =
    participant.preferredLanguage ||
    env.whatsapp.welcomeTemplateLanguage ||
    "mr";

  const templateName =
    env.whatsapp.welcomeTemplateNames?.[
      language
    ] ||
    env.whatsapp.welcomeTemplateName;

  const campaignName =
    env.whatsapp.welcomeApiNames?.[language] ||
    env.whatsapp.apiName;

  if (
    env.whatsapp.provider === "gupshup" &&
    !templateName
  ) {
    throw new ApiError(
      503,
      "WHATSAPP_WELCOME_TEMPLATE_NAME is not configured."
    );
  }

  if (
    env.whatsapp.provider === "tryowbot" &&
    !campaignName
  ) {
    throw new ApiError(
      503,
      "WHATSAPP_API_NAME is not configured."
    );
  }

  const interaction =
    await WhatsAppInteraction.create({
      participant: participant._id,
      mobile: participant.mobile,
      direction: "OUTBOUND",
      method: "ADMIN",
      messageType: "TEMPLATE",
      queryType: "OTHER",
      message: `Welcome template: ${templateName}`,
      status: "PENDING",
      metadata: {
        templateName,
        language,
        campaignName,
      },
    });

  try {
    const result =
      await whatsappProvider.sendTemplate({
        to: getWhatsAppNumber(participant),
        templateName,
        templateId:
          env.whatsapp.gupshupWelcomeTemplateId ||
          templateName,
        languageCode: language,
        apiName: campaignName,
        components: [],
      });

    interaction.status = "SENT";
    interaction.providerMessageId =
      result.providerMessageId;
    interaction.sentAt = new Date();
    interaction.metadata = {
      ...interaction.metadata,
      providerResponse: result.raw,
    };

    await interaction.save();

    return {
      interaction,
      provider: result.raw,
    };
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;

    await interaction.save();

    throw error;
  }
};

/* =========================================================
 * POST EVENT TEMPLATE
 * ========================================================= */

const sendPostEventTemplate = async ({
  participantId,
}) => {
  const participant =
    await getParticipant(participantId);

  const language =
    participant.preferredLanguage || "mr";

  const templateName =
    env.whatsapp.postEventTemplateNames?.[
      language
    ] ||
    env.whatsapp.postEventTemplateName;

  if (!templateName) {
    throw new ApiError(
      503,
      "WHATSAPP_POST_EVENT_TEMPLATE_NAME is not configured."
    );
  }

  /*
   * IMPORTANT:
   * This participant is now entering post-event
   * survey. assessmentStatus is used as the
   * activation flag.
   */

  participant.assessmentStatus = "IN_PROGRESS";
  participant.postEventStep = "NONE";
  participant.followUpRequired = true;
  participant.whatsappStatus = "CONTACTED";
  participant.lastWhatsAppInteractionAt =
    new Date();

  await participant.save();

  const interaction =
    await WhatsAppInteraction.create({
      participant: participant._id,
      mobile: participant.mobile,
      direction: "OUTBOUND",
      method: "ADMIN",
      messageType: "TEMPLATE",
      queryType: "POST_EVENT",
      message: `Post-event template: ${templateName}`,
      status: "PENDING",
      metadata: {
        templateName,
        language,
      },
    });

  try {
    const templateVariables =
      Array.isArray(
        env.whatsapp.postEventTemplateVariables
      )
        ? env.whatsapp.postEventTemplateVariables
        : [];

    const result =
      await whatsappProvider.sendTemplate({
        to: getWhatsAppNumber(participant),
        templateName,
        templateId:
          env.whatsapp.gupshupPostEventTemplateId ||
          templateName,
        languageCode: language,
        components: templateVariables.length
          ? [
              {
                type: "body",
                parameters:
                  templateVariables.map((key) => ({
                    type: "text",
                    text: String(
                      {
                        name: participant.name,
                        participantName:
                          participant.name,
                        event:
                          env.whatsapp.eventName,
                      }[key] ?? ""
                    ),
                  })),
              },
            ]
          : [],
      });

    interaction.status = "SENT";
    interaction.providerMessageId =
      result.providerMessageId;
    interaction.sentAt = new Date();
    interaction.metadata = {
      ...interaction.metadata,
      providerResponse: result.raw,
    };

    await interaction.save();

    return {
      interaction,
      provider: result.raw,
    };
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;

    await interaction.save();

    throw error;
  }
};

/* =========================================================
 * REQUIREMENT SELECTION
 * ========================================================= */

const matchRequirementFromMessage = async ({
  participantId,
  text,
}) => {
  const participant =
    await getParticipant(participantId);

  const requirements =
    await getRequirementOptions();

  const normalizedText = normalize(text);

  const selected = requirements.find((item) =>
    [
      item.name,
      ...(item.keywords || []),
    ].some(
      (candidate) =>
        normalize(candidate) === normalizedText
    )
  );

  if (!selected) return null;

  participant.selectedRequirement =
    selected._id;

  participant.participantStatus =
    "REQUIREMENT_SELECTED";

  participant.followUpRequired = true;
  participant.lastWhatsAppInteractionAt =
    new Date();

  await participant.save();

  return selected;
};

const selectRequirement = async ({
  participantId,
  requirementId,
  method = "BOT",
  message = "",
}) => {
  const participant =
    await getParticipant(participantId);

  const requirement =
    await SupportRequirement.findOne({
      _id: requirementId,
      isActive: true,
    }).lean();

  if (!requirement) {
    throw new ApiError(
      404,
      "Support requirement not found."
    );
  }

  const {
    vendors,
    governmentSchemes,
  } = await findMatches(requirement);

  const interaction =
    await WhatsAppInteraction.create({
      participant: participant._id,
      mobile: participant.mobile,
      direction: "INBOUND",
      method,
      messageType: "REQUIREMENT_SELECTION",
      queryType: "REQUIREMENT_SELECTION",
      message,
      selectedRequirement: requirement._id,
      matchedVendors: vendors.map(
        (item) => item._id
      ),
      matchedGovernmentSchemes:
        governmentSchemes.map(
          (item) => item._id
        ),
      status: "RECEIVED",
    });

  participant.selectedRequirement =
    requirement._id;

  participant.lastWhatsAppInteractionAt =
    new Date();

  participant.followUpRequired = true;

  await participant.save();

  return {
    participant,
    requirement,
    vendors,
    governmentSchemes,
    interaction,
  };
};

/* =========================================================
 * INFORMATION MESSAGE
 * ========================================================= */

const buildInformationMessage = ({
  requirement,
  vendors,
  governmentSchemes,
}) => {
  const lines = [
    `Support selected: ${requirement.name}`,
    "",
  ];

  if (vendors.length) {
    lines.push("Vendor support:");

    vendors.forEach((vendor, index) => {
      lines.push(
        `${index + 1}. ${vendor.name} - ${
          vendor.geography || ""
        }`
      );

      if (vendor.description) {
        lines.push(vendor.description);
      }
    });

    lines.push("");
  }

  if (governmentSchemes.length) {
    lines.push("Government schemes:");

    governmentSchemes.forEach(
      (scheme, index) => {
        lines.push(
          `${index + 1}. ${scheme.schemeName}`
        );

        if (scheme.shortDescription) {
          lines.push(
            scheme.shortDescription
          );
        }

        if (scheme.applicationLink) {
          lines.push(
            `Apply: ${scheme.applicationLink}`
          );
        }
      }
    );
  }

  if (
    !vendors.length &&
    !governmentSchemes.length
  ) {
    lines.push(
      "We could not find matching support information yet. Our team will follow up."
    );
  }

  return lines.join("\n");
};

/* =========================================================
 * SUPPORT SOLUTION DETAILS
 * ========================================================= */

const sendSupportSolutionDetails = async ({
  participant,
  solutionKey,
}) => {
  const label =
    POST_EVENT_OPTIONS.support[solutionKey] ||
    solutionKey;

  const keys = [
    solutionKey,
    solutionKey?.replaceAll("_", " "),
    label,
    label?.replaceAll("/", " "),
  ]
    .map(normalize)
    .filter(Boolean);

  const [
    vendors,
    schemes,
  ] = await Promise.all([
    Vendor.find({
      status: "ACTIVE",
    })
      .limit(250)
      .lean(),

    GovernmentScheme.find({
      status: "ACTIVE",
      isDeleted: false,
    })
      .limit(250)
      .lean(),
  ]);

  const matches = (values) =>
    values
      .filter(Boolean)
      .some((value) => {
        const candidate = normalize(value);

        return keys.some(
          (key) =>
            candidate === key ||
            candidate.includes(key) ||
            key.includes(candidate)
        );
      });

  const matchedVendors = vendors
    .filter((vendor) =>
      matches([
        vendor.valueChain,
        vendor.secondaryValueChain,
        ...(vendor.relatedFields?.interests ||
          []),
        ...(vendor.relatedFields
          ?.participantCategories || []),
      ])
    )
    .slice(0, 5);

  const matchedSchemes = schemes
    .filter((scheme) =>
      matches([
        scheme.category,
        scheme.schemeType,
        ...(scheme.relatedFields?.interests ||
          []),
        ...(scheme.relatedFields
          ?.participantCategories || []),
      ])
    )
    .slice(0, 5);

  const lines = [
    `Support selected: ${label}`,
    "",
  ];

  if (matchedVendors.length) {
    lines.push(
      "Relevant solution providers:"
    );

    matchedVendors.forEach((vendor, index) => {
      lines.push(
        `${index + 1}. ${vendor.name}${
          vendor.geography
            ? ` — ${vendor.geography}`
            : ""
        }`
      );

      if (vendor.description) {
        lines.push(vendor.description);
      }

      if (vendor.email) {
        lines.push(`Email: ${vendor.email}`);
      }

      if (vendor.importantLinks?.[0]?.url) {
        lines.push(
          `More details: ${vendor.importantLinks[0].url}`
        );
      }
    });

    lines.push("");
  }

  if (matchedSchemes.length) {
    lines.push(
      "Relevant government support:"
    );

    matchedSchemes.forEach((scheme, index) => {
      lines.push(
        `${index + 1}. ${scheme.schemeName}`
      );

      if (scheme.shortDescription) {
        lines.push(
          scheme.shortDescription
        );
      }

      if (scheme.applicationLink) {
        lines.push(
          `Apply: ${scheme.applicationLink}`
        );
      } else if (scheme.officialWebsite) {
        lines.push(
          `Details: ${scheme.officialWebsite}`
        );
      }

      if (scheme.helplineNumber) {
        lines.push(
          `Helpline: ${scheme.helplineNumber}`
        );
      }
    });

    lines.push("");
  }

  if (
    !matchedVendors.length &&
    !matchedSchemes.length
  ) {
    lines.push(
      "We have recorded your requirement. Our team will share relevant details when a matching provider is available.",
      ""
    );
  }

  lines.push(
    "Did you find a particular solution, technology, or solution provider at the Mela that you want to explore further? Reply with the name, or No."
  );

  await sendLocalizedText({
    participant,
    body: await localized(
      participant,
      lines.join("\n")
    ),
    messageType: "VENDOR_DETAILS",
    queryType: "INFORMATION_REQUEST",
    metadata: {
      supportSolution: solutionKey,
      vendorIds: matchedVendors.map(
        (vendor) => vendor._id
      ),
      governmentSchemeIds:
        matchedSchemes.map(
          (scheme) => scheme._id
        ),
    },
  });

  participant.matchedVendorIds =
    Array.from(
      new Set([
        ...(participant.matchedVendorIds || []).map(
          String
        ),
        ...matchedVendors.map((vendor) =>
          String(vendor._id)
        ),
      ])
    ).map(
      (id) =>
        new mongoose.Types.ObjectId(id)
    );

  participant.solutionTracks = [
    ...(participant.solutionTracks || []),
    {
      solution: solutionKey,
      requirement: label,
      status:
        matchedVendors.length ||
        matchedSchemes.length
          ? "MATCHED"
          : "IDENTIFIED",
      notes:
        matchedVendors.length ||
        matchedSchemes.length
          ? `Matched ${matchedVendors.length} provider(s) and ${matchedSchemes.length} government support option(s).`
          : "No direct match found yet.",
      updatedAt: new Date(),
    },
  ];

  await participant.save();

  return {
    matchedVendors,
    matchedSchemes,
  };
};

/* =========================================================
 * POST EVENT PROCESSOR
 * ========================================================= */

const processPostEventReply = async ({
  participant,
  text,
}) => {
  const step =
    participant.postEventStep || "NONE";

  const normalizedText =
    normalizeChoiceText(text);

  /* -----------------------------------------
   * STEP 1: YES / NO
   * ----------------------------------------- */

  if (step === "NONE") {
    const yesValues = [
      "yes",
      "yes please",
      "होय",
      "हो",
      "होय.",
      "हो.",
      "હા",
      "હા.",
    ];

    const noValues = [
      "no",
      "नाही",
      "नको",
      "नाही धन्यवाद",
      "नाही.",
      "नको.",
      "ના",
      "ના.",
    ];

    if (yesValues.includes(normalizedText)) {
      participant.postEventStep =
        "LIVELIHOOD";

      participant.assessmentStatus =
        "IN_PROGRESS";

      participant.followUpRequired = true;

      await participant.save();

      await sendLocalizedText({
        participant,
        body: `तुमच्या उपजीविकेचा मुख्य प्रकार कोणता आहे?

1. शेती
2. पशुपालन
3. सूक्ष्म व्यवसाय / छोटा व्यवसाय
4. इतर`,
        messageType:
          "REQUIREMENT_QUESTION",
        queryType: "POST_EVENT",
      });

      return true;
    }

    if (noValues.includes(normalizedText)) {
      participant.postEventStep =
        "COMPLETED";

      participant.assessmentStatus =
        "COMPLETED";

      participant.followUpRequired = false;

      await participant.save();

      await sendLocalizedText({
        participant,
        body:
          "ठीक आहे. तुमचा वेळ दिल्याबद्दल धन्यवाद!",
        queryType: "POST_EVENT",
      });

      return true;
    }

    /*
     * Since NONE means waiting for YES/NO,
     * don't allow normal support flow here.
     */

    await sendLocalizedText({
      participant,
      body:
        "कृपया Yes / होय किंवा No / नाही असे उत्तर द्या.",
      queryType: "POST_EVENT",
    });

    return true;
  }

  /* -----------------------------------------
   * COMPLETED
   * ----------------------------------------- */

  if (step === "COMPLETED") {
    return false;
  }

  /* -----------------------------------------
   * Q2: LIVELIHOOD
   * ----------------------------------------- */

  if (step === "LIVELIHOOD") {
    const value = await matchChoice(
      participant,
      text,
      POST_EVENT_OPTIONS.livelihood
    );

    if (!value) {
      await sendLocalizedText({
        participant,
        body: `कृपया खालीलपैकी योग्य पर्यायाचा क्रमांक किंवा नाव पाठवा:

1. शेती
2. पशुपालन
3. सूक्ष्म व्यवसाय / छोटा व्यवसाय
4. इतर`,
        queryType: "POST_EVENT",
      });

      return true;
    }

    const selectedValues = Array.isArray(
      value
    )
      ? value
      : [value];

    participant.livelihoodCategories =
      Array.from(
        new Set([
          ...(participant.livelihoodCategories ||
            []),
          ...selectedValues,
        ])
      );

    participant.postEventStep =
      "SUPPORT";

    await participant.save();

    await sendLocalizedText({
      participant,
      body: `तुम्हाला कोणत्या प्रकारची मदत किंवा उपाययोजना हवी आहे?

1. तंत्रज्ञान / यंत्रसामग्री
2. सौर ऊर्जा / ऊर्जा उपाय
3. उत्पादन विकास
4. ब्रँडिंग आणि मार्केटिंग
5. पॅकेजिंग
6. वित्तपुरवठा
7. प्रशिक्षण
8. बाजारपेठेशी जोडणी
9. इतर`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  /* -----------------------------------------
   * Q3: SUPPORT
   * ----------------------------------------- */

  if (step === "SUPPORT") {
    const value = await matchChoice(
      participant,
      text,
      POST_EVENT_OPTIONS.support
    );

    if (!value) {
      await sendLocalizedText({
        participant,
        body: `कृपया खालीलपैकी मदतीचा क्रमांक किंवा नाव पाठवा:

1. तंत्रज्ञान / यंत्रसामग्री
2. सौर ऊर्जा / ऊर्जा उपाय
3. उत्पादन विकास
4. ब्रँडिंग आणि मार्केटिंग
5. पॅकेजिंग
6. वित्तपुरवठा
7. प्रशिक्षण
8. बाजारपेठेशी जोडणी
9. इतर`,
        queryType: "POST_EVENT",
      });

      return true;
    }

    const selectedValues = Array.isArray(
      value
    )
      ? value
      : [value];

    participant.supportSolutions =
      Array.from(
        new Set([
          ...(participant.supportSolutions ||
            []),
          ...selectedValues,
        ])
      );

    participant.postEventStep =
      "SPECIFIC_SOLUTION";

    participant.followUpRequired = true;

    await participant.save();

    /*
     * IMPORTANT:
     * Process every selected support separately.
     */

    for (const solutionKey of selectedValues) {
      await sendSupportSolutionDetails({
        participant,
        solutionKey,
      });
    }

    return true;
  }

  /* -----------------------------------------
   * Q4: SPECIFIC SOLUTION / PROVIDER
   * ----------------------------------------- */

  if (step === "SPECIFIC_SOLUTION") {
    const yesValues = [
      "yes",
      "yes please",
      "होय",
      "हो",
      "હા",
    ];

    const noValues = [
      "no",
      "नाही",
      "नको",
      "नाही धन्यवाद",
      "ના",
    ];

    if (noValues.includes(normalizedText)) {
      participant.specificSolutionProviderInterested =
        false;

      participant.specificSolutionProviderInterest =
        "";
    } else if (
      yesValues.includes(normalizedText)
    ) {
      participant.specificSolutionProviderInterested =
        true;

      participant.specificSolutionProviderInterest =
        "Yes";
    } else {
      participant.specificSolutionProviderInterested =
        true;

      participant.specificSolutionProviderInterest =
        String(text || "").trim();
    }

    participant.postEventStep =
      "NEXT_ACTION";

    await participant.save();

    await sendLocalizedText({
      participant,
      body: `पुढे तुम्हाला काय करायचे आहे?

1. उपाययोजना अधिक चांगल्या प्रकारे समजून घेणे
2. उपाय प्रदात्याशी बोलणे
3. खर्चाचा अंदाज घेणे
4. वित्तपुरवठ्याचे पर्याय जाणून घेणे
5. अंमलबजावणीबाबत चर्चा करणे
6. इतर`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  /* -----------------------------------------
   * Q5: NEXT ACTION
   * ----------------------------------------- */

  if (step === "NEXT_ACTION") {
    const value = await matchChoice(
      participant,
      text,
      POST_EVENT_OPTIONS.nextAction
    );

    if (!value) {
      await sendLocalizedText({
        participant,
        body: `कृपया खालीलपैकी एक पर्याय पाठवा:

1. उपाययोजना अधिक चांगल्या प्रकारे समजून घेणे
2. उपाय प्रदात्याशी बोलणे
3. खर्चाचा अंदाज घेणे
4. वित्तपुरवठ्याचे पर्याय जाणून घेणे
5. अंमलबजावणीबाबत चर्चा करणे
6. इतर`,
        queryType: "POST_EVENT",
      });

      return true;
    }

    const selectedValues = Array.isArray(
      value
    )
      ? value
      : [value];

    participant.nextActions =
      Array.from(
        new Set([
          ...(participant.nextActions || []),
          ...selectedValues,
        ])
      );

    participant.postEventStep =
      "USEFUL";

    await participant.save();

    await sendLocalizedText({
      participant,
      body: `मेळ्यात तुम्हाला सर्वात उपयुक्त काय वाटले?

1. तंत्रज्ञान / यंत्रसामग्री
2. सौर ऊर्जा / ऊर्जा उपाय
3. उपाय प्रदात्यांशी संवाद
4. वक्ते / सत्रे
5. प्रात्यक्षिके
6. वित्तपुरवठा / सहाय्याची माहिती
7. इतर सहभागींसोबत नेटवर्किंग
8. इतर

एकापेक्षा जास्त पर्याय असल्यास 1,2 अशा प्रकारे पाठवू शकता.`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  /* -----------------------------------------
   * Q6: USEFUL
   * ----------------------------------------- */

  if (step === "USEFUL") {
    const normalizedInput =
      normalizeChoiceText(text);

    /*
     * matchChoice already supports multiple
     * numeric choices.
     */

    const values = normalizedInput
      .split(/[,/|]+|\s+(?:and|&)\s+/i)
      .map((item) => item.trim())
      .filter(Boolean);

    const matched = [];

    for (const value of values) {
      const key = await matchChoice(
        participant,
        value,
        POST_EVENT_OPTIONS.useful
      );

      if (key) {
        if (Array.isArray(key)) {
          matched.push(...key);
        } else {
          matched.push(key);
        }
      }
    }

    /*
     * Also support a single complete label.
     */

    if (!matched.length) {
      const single =
        await matchChoice(
          participant,
          normalizedInput,
          POST_EVENT_OPTIONS.useful
        );

      if (single) {
        if (Array.isArray(single)) {
          matched.push(...single);
        } else {
          matched.push(single);
        }
      }
    }

    const uniqueMatched =
      Array.from(new Set(matched));

    if (!uniqueMatched.length) {
      await sendLocalizedText({
        participant,
        body: `कृपया मेळ्यात तुम्हाला काय उपयुक्त वाटले ते सांगा.

उदा. तंत्रज्ञान / यंत्रसामग्री, सौर ऊर्जा, उपाय प्रदाते, प्रात्यक्षिके, वित्तपुरवठा / सहाय्य किंवा नेटवर्किंग.`,
        queryType: "POST_EVENT",
      });

      return true;
    }

    participant.usefulAtMela =
      Array.from(
        new Set([
          ...(participant.usefulAtMela || []),
          ...uniqueMatched,
        ])
      );

    participant.postEventStep =
      "FEEDBACK";

    await participant.save();

    await sendLocalizedText({
      participant,
      body: `मेळ्यात आणखी काय चांगले करता आले असते?

कृपया तुमचा अभिप्राय पाठवा.`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  /* -----------------------------------------
   * FINAL FEEDBACK
   * ----------------------------------------- */

  if (step === "FEEDBACK") {
    participant.whatCouldBeBetter =
      String(text || "").trim();

    participant.postEventStep =
      "COMPLETED";

    participant.assessmentStatus =
      "COMPLETED";

    participant.followUpRequired = true;

    await participant.save();

    await sendLocalizedText({
      participant,
      body: `तुमच्या गरजा आणि अभिप्राय शेअर केल्याबद्दल धन्यवाद!

आमची टीम तुमच्यासाठी संबंधित उपाय आणि उपाय प्रदात्यांची माहिती शेअर करेल.`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  return false;
};

/* =========================================================
 * VALUE CHAIN
 * ========================================================= */

const matchValueChainFromMessage = async ({
  participantId,
  text,
}) => {
  const participant =
    await getParticipant(participantId);

  const normalized =
    normalizeChoiceText(text);

  if (!normalized) return null;

  const vendors =
    await Vendor.find({
      status: "ACTIVE",
    })
      .limit(200)
      .lean();

  const match = vendors.find((vendor) =>
    [
      vendor.valueChain,
      vendor.secondaryValueChain,
      ...(vendor.relatedFields?.interests ||
        []),
    ]
      .filter(Boolean)
      .some((value) => {
        const candidate = normalize(value);

        return (
          candidate === normalized ||
          candidate.includes(normalized) ||
          normalized.includes(candidate)
        );
      })
  );

  if (!match) return null;

  const valueChain =
    match.valueChain ||
    match.secondaryValueChain ||
    String(text).trim();

  participant.valueChains =
    Array.from(
      new Set([
        ...(participant.valueChains || []),
        valueChain,
      ])
    );

  participant.participantStatus =
    "REQUIREMENT_SELECTED";

  participant.followUpRequired = true;

  participant.lastWhatsAppInteractionAt =
    new Date();

  await participant.save();

  const normalizedValueChain =
    normalize(valueChain);

  const matchingVendors = vendors
    .filter((vendor) =>
      [
        vendor.valueChain,
        vendor.secondaryValueChain,
        ...(vendor.relatedFields?.interests ||
          []),
      ]
        .filter(Boolean)
        .some((value) => {
          const candidate =
            normalize(value);

          return (
            candidate ===
              normalizedValueChain ||
            candidate.includes(
              normalizedValueChain
            ) ||
            normalizedValueChain.includes(
              candidate
            )
          );
        })
    )
    .slice(0, 10);

  const lines = [
    `You selected: ${valueChain}`,
    "",
    matchingVendors.length
      ? "Matching solution providers:"
      : "We are finding matching solution providers for you.",
    ...matchingVendors.map(
      (vendor, index) =>
        `${index + 1}. ${vendor.name}${
          vendor.geography
            ? ` — ${vendor.geography}`
            : ""
        }`
    ),
  ];

  await sendLocalizedText({
    participant,
    body: lines.join("\n"),
    messageType: "VENDOR_DETAILS",
    queryType: "VALUE_CHAIN_SELECTION",
    metadata: {
      valueChain,
      vendorIds: matchingVendors.map(
        (vendor) => vendor._id
      ),
    },
  });

  return {
    valueChain,
    vendors: matchingVendors,
  };
};

/* =========================================================
 * SEND REQUIREMENT INFORMATION
 * ========================================================= */

const sendRequirementInformation = async ({
  participantId,
  requirementId,
}) => {
  const result =
    await selectRequirement({
      participantId,
      requirementId,
      method: "BOT",
    });

  const body =
    buildInformationMessage(result);

  const interaction =
    await WhatsAppInteraction.create({
      participant:
        result.participant._id,
      mobile:
        result.participant.mobile,
      direction: "OUTBOUND",
      method: "BOT",
      messageType: "VENDOR_DETAILS",
      queryType: "INFORMATION_REQUEST",
      message: body,
      selectedRequirement:
        result.requirement._id,
      matchedVendors:
        result.vendors.map(
          (item) => item._id
        ),
      matchedGovernmentSchemes:
        result.governmentSchemes.map(
          (item) => item._id
        ),
      status: "PENDING",
    });

  try {
    const providerResult =
      await whatsappProvider.sendText({
        to: getWhatsAppNumber(
          result.participant
        ),
        body,
      });

    interaction.status = "SENT";

    interaction.providerMessageId =
      providerResult.providerMessageId;

    interaction.sentAt = new Date();

    interaction.metadata = {
      ...interaction.metadata,
      providerResponse:
        providerResult.raw,
    };

    await interaction.save();

    if (result.vendors.length) {
      result.participant.participantStatus =
        "VENDOR_SHARED";
    }

    if (result.governmentSchemes.length) {
      result.participant.participantStatus =
        "GOVERNMENT_SCHEME_SHARED";
    }

    await result.participant.save();

    return {
      ...result,
      message: body,
      interaction,
    };
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage =
      error.message;

    await interaction.save();

    throw error;
  }
};

/* =========================================================
 * ADMIN MESSAGE
 * ========================================================= */

const sendAdminMessage = async ({
  participantId,
  message,
  staffId,
}) => {
  const participant =
    await getParticipant(participantId);

  const interaction =
    await WhatsAppInteraction.create({
      participant: participant._id,
      mobile: participant.mobile,
      direction: "OUTBOUND",
      method: "ADMIN",
      messageType: "TEXT",
      queryType: "FOLLOW_UP",
      message,
      status: "PENDING",
      metadata: {
        sentBy: String(staffId),
      },
    });

  try {
    const providerResult =
      await whatsappProvider.sendText({
        to: getWhatsAppNumber(participant),
        body: message,
      });

    interaction.status = "SENT";

    interaction.providerMessageId =
      providerResult.providerMessageId;

    interaction.sentAt = new Date();

    interaction.metadata = {
      ...interaction.metadata,
      providerResponse:
        providerResult.raw,
    };

    await interaction.save();

    participant.whatsappStatus =
      "CONTACTED";

    participant.participantStatus =
      "WHATSAPP_CONTACTED";

    participant.lastWhatsAppInteractionAt =
      new Date();

    await participant.save();

    return interaction;
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage =
      error.message;

    await interaction.save();

    throw error;
  }
};

/* =========================================================
 * BULK SEND
 * ========================================================= */

const bulkSend = async ({
  participantIds,
  message,
  staffId,
}) => {
  if (
    !Array.isArray(participantIds) ||
    !participantIds.length
  ) {
    throw new ApiError(
      400,
      "At least one participant is required."
    );
  }

  const results = [];

  for (const participantId of participantIds) {
    try {
      const interaction =
        await sendAdminMessage({
          participantId,
          message,
          staffId,
        });

      results.push({
        participantId,
        success: true,
        interactionId:
          interaction._id,
      });
    } catch (error) {
      results.push({
        participantId,
        success: false,
        message: error.message,
      });
    }
  }

  return {
    total: participantIds.length,
    sent: results.filter(
      (item) => item.success
    ).length,
    failed: results.filter(
      (item) => !item.success
    ).length,
    results,
  };
};

/* =========================================================
 * INTERACTIONS
 * ========================================================= */

const getParticipantInteractions =
  async (participantId) => {
    return WhatsAppInteraction.find({
      participant: participantId,
    })
      .populate(
        "selectedRequirement",
        "name"
      )
      .populate(
        "matchedVendors",
        "name geography"
      )
      .populate(
        "matchedGovernmentSchemes",
        "schemeName category"
      )
      .sort({ createdAt: -1 })
      .lean();
  };

/* =========================================================
 * WEBHOOK HELPERS
 * ========================================================= */

const saveInboundInteraction = async ({
  participant,
  text,
  providerMessageId,
  metadata,
}) => {
  if (providerMessageId) {
    const existing =
      await WhatsAppInteraction.findOne({
        providerMessageId,
      }).select("_id");

    if (existing) {
      return false;
    }
  }

  await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "INBOUND",
    method: "WEBHOOK",
    messageType: "TEXT",
    queryType: "SUPPORT_REQUEST",
    message: text,
    status: "RECEIVED",
    providerMessageId,
    externalMessageKey:
      providerMessageId,
    metadata,
  });

  participant.whatsappStatus = "ACTIVE";

  participant.lastWhatsAppInteractionAt =
    new Date();

  await participant.save();

  return true;
};

/*
 * IMPORTANT:
 * Only participants for whom the post-event survey
 * was explicitly started should enter the survey.
 *
 * assessmentStatus = IN_PROGRESS is set by
 * sendPostEventTemplate().
 */

const shouldProcessPostEvent = (
  participant
) => {
  const step =
    participant.postEventStep || "NONE";

  return (
    participant.assessmentStatus ===
      "IN_PROGRESS" &&
    [
      "NONE",
      "LIVELIHOOD",
      "SUPPORT",
      "SPECIFIC_SOLUTION",
      "NEXT_ACTION",
      "USEFUL",
      "FEEDBACK",
    ].includes(step)
  );
};

const processNormalWhatsAppFlow = async ({
  participant,
  text,
}) => {
  participant.participantStatus =
    classifyParticipantResponse(text);

  participant.followUpRequired =
    participant.participantStatus !==
    "PROBLEM_SOLVED";

  await participant.save();

  const requirements =
    await getRequirementOptions();

  const selectedRequirement =
    requirements.find((item) =>
      [
        item.name,
        ...(item.keywords || []),
      ].some(
        (candidate) =>
          normalize(candidate) ===
          normalize(text)
      )
    );

  if (selectedRequirement) {
    await sendRequirementInformation({
      participantId: participant._id,
      requirementId:
        selectedRequirement._id,
    });

    return;
  }

  await matchValueChainFromMessage({
    participantId: participant._id,
    text,
  });
};

/* =========================================================
 * GUPSHUP V2 WEBHOOK
 * ========================================================= */

const handleGupshupV2Webhook = async (
  payload
) => {
  /*
   * MESSAGE EVENT
   */

  if (payload.type === "message-event") {
    const event = payload.payload || {};

    const providerMessageId =
      event.gsId || event.id;

    const mapped = {
      enqueued: "PENDING",
      failed: "FAILED",
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
    }[String(event.type || "").toLowerCase()];

    if (
      providerMessageId &&
      mapped
    ) {
      const update = {
        status: mapped,
      };

      if (mapped === "SENT") {
        update.sentAt = new Date();
      }

      if (mapped === "FAILED") {
        update.errorMessage =
          event.payload?.reason ||
          event.payload?.error ||
          "Gupshup delivery failed.";
      }

      await WhatsAppInteraction.findOneAndUpdate(
        {
          providerMessageId,
        },
        {
          $set: update,
        },
        {
          new: true,
        }
      );
    }

    return;
  }

  /*
   * INCOMING MESSAGE
   */

  if (payload.type !== "message") {
    return;
  }

  const message = payload.payload || {};

  if (message.type === "request_welcome") {
    return;
  }

  const mobile = String(
    message.source ||
      message.sender?.phone ||
      ""
  ).replace(/\D/g, "");

  if (!mobile) {
    return;
  }

  const participant =
    await Participant.findOne({
      mobile: mobile.slice(-10),
      isDeleted: false,
    });

  if (!participant) {
    return;
  }

  let text = "";

  /*
   * Text
   */

  if (
    message.type === "text" ||
    message.type === "txt"
  ) {
    text = String(
      message.payload?.text ||
        message.payload ||
        ""
    ).trim();
  }

  /*
   * Button / list reply
   */

  if (
    message.type === "button_reply" ||
    message.type === "list_reply"
  ) {
    text = String(
      message.payload?.title ||
        message.payload?.text ||
        message.payload?.postbackText ||
        message.payload?.id ||
        ""
    ).trim();
  }

  /*
   * Other button payload
   */

  if (
    !text &&
    message.payload?.type === "button"
  ) {
    text = String(
      message.payload?.text || ""
    ).trim();
  }

  if (!text) {
    return;
  }

  const providerMessageId =
    message.id ||
    message.payload?.id ||
    null;

  const saved =
    await saveInboundInteraction({
      participant,
      text,
      providerMessageId,
      metadata: payload,
    });

  if (!saved) {
    return;
  }

  /*
   * POST EVENT FLOW
   */

  if (shouldProcessPostEvent(participant)) {
    const handled =
      await processPostEventReply({
        participant,
        text,
      });

    if (handled) {
      return;
    }
  }

  /*
   * NORMAL SUPPORT FLOW
   */

  await processNormalWhatsAppFlow({
    participant,
    text,
  });
};

/* =========================================================
 * META WEBHOOK
 * ========================================================= */

const handleMetaWebhook = async (
  payload
) => {
  const entries = payload?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;

      /*
       * DELIVERY STATUS
       */

      await handleWebhookStatuses(
        value?.statuses || []
      );

      const messages =
        value?.messages || [];

      for (const message of messages) {
        const mobile = String(
          message.from || ""
        ).replace(/\D/g, "");

        if (!mobile) {
          continue;
        }

        /*
         * Text message
         */

        let text =
          message?.text?.body?.trim() || "";

        /*
         * Interactive button reply
         */

        if (
          !text &&
          message?.interactive
            ?.button_reply
        ) {
          text =
            message.interactive.button_reply
              .title ||
            message.interactive.button_reply
              .id ||
            "";
        }

        /*
         * Interactive list reply
         */

        if (
          !text &&
          message?.interactive
            ?.list_reply
        ) {
          text =
            message.interactive.list_reply
              .title ||
            message.interactive.list_reply
              .id ||
            "";
        }

        text = String(text).trim();

        if (!text) {
          continue;
        }

        const participant =
          await Participant.findOne({
            mobile: mobile.slice(-10),
            isDeleted: false,
          });

        if (!participant) {
          continue;
        }

        const providerMessageId =
          message.id || null;

        const saved =
          await saveInboundInteraction({
            participant,
            text,
            providerMessageId,
            metadata: message,
          });

        if (!saved) {
          continue;
        }

        /*
         * POST EVENT FLOW FIRST
         */

        if (
          shouldProcessPostEvent(
            participant
          )
        ) {
          const handled =
            await processPostEventReply({
              participant,
              text,
            });

          if (handled) {
            continue;
          }
        }

        /*
         * NORMAL SUPPORT FLOW
         */

        await processNormalWhatsAppFlow({
          participant,
          text,
        });
      }
    }
  }
};

/* =========================================================
 * MAIN WEBHOOK
 * ========================================================= */

const handleWebhookMessage = async (
  payload
) => {
  /*
   * Gupshup V2
   */

  if (
    env.whatsapp.provider === "gupshup" &&
    payload?.version === 2
  ) {
    await handleGupshupV2Webhook(
      payload
    );

    return;
  }

  /*
   * Meta / WhatsApp format
   */

  await handleMetaWebhook(payload);
};

/* =========================================================
 * EXPORT
 * ========================================================= */

export default {
  getRequirementOptions,
  getParticipant,
  sendWelcomeTemplate,
  sendPostEventTemplate,
  selectRequirement,
  sendRequirementInformation,
  sendAdminMessage,
  bulkSend,
  getParticipantInteractions,
  handleWebhookMessage,
  classifyParticipantResponse,
  matchRequirementFromMessage,
  matchValueChainFromMessage,
  processPostEventReply,
};