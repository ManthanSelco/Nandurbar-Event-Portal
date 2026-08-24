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

const normalize = (value) =>
  String(value || "").trim().toLowerCase();

const classifyParticipantResponse = (text = "") => {
  const value = normalize(text);

  const solved = [
    "problem solved", "issue solved", "solved", "resolved",
    "समस्या हल", "समस्या सुटली", "प्रॉब्लेम सॉल्व",
    "समस्या सोडवली", "समस्या सुटली",
    "સમસ્યા ઉકેલાઈ", "સમસ્યા ઉકેલી", "ઉકેલાઈ",
  ];

  const progress = [
    "in progress", "working", "work in progress", "under process",
    "प्रक्रिया में", "काम सुरू", "काम चालू", "प्रगतीत",
    "પ્રક્રિયામાં", "કામ ચાલુ", "પ્રગતિમાં",
  ];

  if (solved.some((item) => value.includes(normalize(item)))) return "PROBLEM_SOLVED";
  if (progress.some((item) => value.includes(normalize(item)))) return "IN_PROGRESS";
  return "QUERY_RAISED";
};

const handleWebhookStatuses = async (statuses = []) => {
  for (const status of statuses) {
    const providerMessageId = status?.id;
    if (!providerMessageId) continue;

    const mapped = {
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
    }[status?.status];

    if (!mapped) continue;

    const interaction = await WhatsAppInteraction.findOneAndUpdate(
      { providerMessageId },
      {
        $set: {
          status: mapped,
          ...(mapped === "SENT" ? { sentAt: new Date() } : {}),
          ...(mapped === "FAILED"
            ? { errorMessage: status?.errors?.[0]?.title || "WhatsApp delivery failed." }
            : {}),
        },
      },
      { returnDocument: "after" }
    );

    if (!interaction?.participant) continue;

    await Participant.updateOne(
      { _id: interaction.participant },
      {
        $set: {
          whatsappStatus: mapped === "FAILED" ? "FAILED" : "ACTIVE",
          lastWhatsAppInteractionAt: new Date(),
        },
      }
    );
  }
};

const findMatches = async (requirement) => {
  const names = [requirement.name, ...(requirement.keywords || [])]
    .map(normalize)
    .filter(Boolean);

  const regexes = names.map((name) => new RegExp(name, "i"));

  const vendorFilter = {
    status: "ACTIVE",
    $or: [
      { valueChain: { $in: regexes } },
      { secondaryValueChain: { $in: regexes } },
      { "relatedFields.interests": { $in: regexes } },
    ],
  };

  const schemeFilter = {
    status: "ACTIVE",
    isDeleted: false,
    $or: [
      { category: { $in: regexes } },
      { "relatedFields.interests": { $in: regexes } },
    ],
  };

  const [vendors, governmentSchemes] = await Promise.all([
    Vendor.find(vendorFilter).limit(20).lean(),
    GovernmentScheme.find(schemeFilter).limit(20).lean(),
  ]);

  return { vendors, governmentSchemes };
};


const sendWelcomeTemplate = async ({ participantId }) => {
  const participant = await getParticipant(participantId);
  const language = participant.preferredLanguage || env.whatsapp.welcomeTemplateLanguage || "mr";
  const templateName = env.whatsapp.welcomeTemplateNames?.[language] || env.whatsapp.welcomeTemplateName;
  const campaignName = env.whatsapp.welcomeApiNames?.[language] || env.whatsapp.apiName;
  if (env.whatsapp.provider === "gupshup" && !templateName) throw new ApiError(503, "WHATSAPP_WELCOME_TEMPLATE_NAME is not configured.");
  if (env.whatsapp.provider === "tryowbot" && !campaignName) throw new ApiError(503, "WHATSAPP_API_NAME is not configured.");

  const interaction = await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "OUTBOUND",
    method: "ADMIN",
    messageType: "TEMPLATE",
    queryType: "OTHER",
    message: `Test welcome template: ${env.whatsapp.welcomeTemplateName || env.whatsapp.templateName || "configured campaign"}`,
    status: "PENDING",
    metadata: {
      templateName,
      language,
      campaignName,
      test: true,
    },
  });

  try {
    const result = await whatsappProvider.sendTemplate({
      to: `${String(participant.countryCode || "+91").replace("+", "")}${participant.mobile}`,
      templateName,
      templateId: env.whatsapp.gupshupWelcomeTemplateId || templateName,
      languageCode: language,
      apiName: campaignName,
      components: [],
    });

    interaction.status = "SENT";
    interaction.providerMessageId = result.providerMessageId;
    interaction.sentAt = new Date();
    interaction.metadata = { ...interaction.metadata, providerResponse: result.raw };
    await interaction.save();

    return { interaction, provider: result.raw };
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;
    await interaction.save();
    throw error;
  }
};


const sendPostEventTemplate = async ({ participantId }) => {
  const participant = await getParticipant(participantId);
  const language = participant.preferredLanguage || "mr";
  const templateName = env.whatsapp.postEventTemplateNames?.[language] || env.whatsapp.postEventTemplateName;
  if (!templateName) throw new ApiError(503, "WHATSAPP_POST_EVENT_TEMPLATE_NAME is not configured.");

  const interaction = await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "OUTBOUND",
    method: "ADMIN",
    messageType: "TEMPLATE",
    queryType: "POST_EVENT",
    message: `Post-event template: ${templateName}`,
    status: "PENDING",
    metadata: { templateName, language },
  });
  try {
    const result = await whatsappProvider.sendTemplate({
      to: `${String(participant.countryCode || "+91").replace("+", "")}${participant.mobile}`,
      templateName,
      templateId: env.whatsapp.gupshupPostEventTemplateId || templateName,
      languageCode: language,
      components: env.whatsapp.postEventTemplateVariables.length ? [{ type: "body", parameters: env.whatsapp.postEventTemplateVariables.map((key) => ({ type: "text", text: String({ name: participant.name, participantName: participant.name, event: env.whatsapp.eventName }[key] ?? "") })) }] : [],
    });
    interaction.status = "SENT";
    interaction.providerMessageId = result.providerMessageId;
    interaction.sentAt = new Date();
    interaction.metadata = { ...interaction.metadata, providerResponse: result.raw };
    await interaction.save();
    await Participant.updateOne({ _id: participant._id }, { $set: { whatsappStatus: "CONTACTED", lastWhatsAppInteractionAt: new Date(), followUpRequired: true, postEventStep: "NONE" } });
    return { interaction, provider: result.raw };
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;
    await interaction.save();
    throw error;
  }
};

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

  if (!participant.mobile || !participant.whatsappAvailable) {
    throw new ApiError(
      400,
      "Participant does not have an available WhatsApp mobile number."
    );
  }

  return participant;
};

const getRequirementOptions = async () => {
  return SupportRequirement.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
};

const matchRequirementFromMessage = async ({ participantId, text }) => {
  const participant = await getParticipant(participantId);
  const requirements = await getRequirementOptions();
  const normalizedText = normalize(text);

  const selected = requirements.find((item) =>
    [item.name, ...(item.keywords || [])].some(
      (candidate) => normalize(candidate) === normalizedText
    )
  );

  if (!selected) return null;

  participant.selectedRequirement = selected._id;
  participant.participantStatus = "REQUIREMENT_SELECTED";
  participant.followUpRequired = true;
  participant.lastWhatsAppInteractionAt = new Date();
  await participant.save();

  return selected;
};

const selectRequirement = async ({
  participantId,
  requirementId,
  method = "BOT",
  message = "",
}) => {
  const participant = await getParticipant(participantId);

  const requirement = await SupportRequirement.findOne({
    _id: requirementId,
    isActive: true,
  }).lean();

  if (!requirement) {
    throw new ApiError(404, "Support requirement not found.");
  }

  const { vendors, governmentSchemes } =
    await findMatches(requirement);

  const participantStatus = classifyParticipantResponse(text);
const followUpRequired = participantStatus !== "PROBLEM_SOLVED";

await Participant.updateOne(
  { _id: participant._id },
  {
    $set: {
      whatsappStatus: "ACTIVE",
      lastWhatsAppInteractionAt: new Date(),
      participantStatus,
      followUpRequired,
      ...(participant.postEventStep === undefined ||
      participant.postEventStep === null ||
      participant.postEventStep === "NONE"
        ? { postEventStep: "LIVELIHOOD" }
        : {}),
    },
  }
);

participant.whatsappStatus = "ACTIVE";
participant.lastWhatsAppInteractionAt = new Date();
if (!participant.postEventStep || participant.postEventStep === "NONE") {
  participant.postEventStep = "LIVELIHOOD";
}
participant.participantStatus = participantStatus;
participant.followUpRequired = followUpRequired;

  const interaction = await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "INBOUND",
    method,
    messageType: "REQUIREMENT_SELECTION",
    queryType: "REQUIREMENT_SELECTION",
    message,
    selectedRequirement: requirement._id,
    matchedVendors: vendors.map((item) => item._id),
    matchedGovernmentSchemes: governmentSchemes.map(
      (item) => item._id
    ),
    status: "RECEIVED",
  });

  return {
    participant,
    requirement,
    vendors,
    governmentSchemes,
    interaction,
  };
};

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
        `${index + 1}. ${vendor.name} - ${vendor.geography}`
      );
      if (vendor.description) lines.push(vendor.description);
    });
    lines.push("");
  }

  if (governmentSchemes.length) {
    lines.push("Government schemes:");
    governmentSchemes.forEach((scheme, index) => {
      lines.push(
        `${index + 1}. ${scheme.schemeName}`
      );
      if (scheme.shortDescription) {
        lines.push(scheme.shortDescription);
      }
      if (scheme.applicationLink) {
        lines.push(`Apply: ${scheme.applicationLink}`);
      }
    });
  }

  if (!vendors.length && !governmentSchemes.length) {
    lines.push(
      "We could not find matching support information yet. Our team will follow up."
    );
  }

  return lines.join("\n");
};



const localized = async (participant, text) => {
  const language = participant.preferredLanguage || "mr";
  if (language === "en") return text;
  const [translated] = await googleTranslation.translateTexts([text], language);
  return translated || text;
};

const POST_EVENT_OPTIONS = {
  livelihood: {
    AGRICULTURE: "Agriculture",
    ANIMAL_HUSBANDRY: "Animal Husbandry",
    MICRO_BUSINESS: "Micro-business / small business",
    OTHER: "Other",
  },
  support: {
    TECHNOLOGY_MACHINERY: "Technology / machinery",
    SOLAR_ENERGY: "Solar / energy solutions",
    PRODUCT_DEVELOPMENT: "Product development",
    BRANDING_MARKETING: "Branding & marketing",
    PACKAGING: "Packaging",
    FINANCING: "Financing",
    TRAINING: "Training",
    MARKET_LINKAGE: "Market linkage",
    OTHER: "Other",
  },
  nextAction: {
    UNDERSTAND_SOLUTION: "Understand the solution better",
    SPEAK_TO_PROVIDER: "Speak to the solution provider",
    GET_COST_ESTIMATE: "Get a cost estimate",
    EXPLORE_FINANCING: "Explore financing options",
    DISCUSS_IMPLEMENTATION: "Discuss implementation",
    OTHER: "Other",
  },
  useful: {
    TECHNOLOGIES_MACHINERY: "Technologies / machinery showcased",
    SOLAR_ENERGY: "Solar / energy solutions",
    SOLUTION_PROVIDERS: "Interaction with solution providers",
    SPEAKERS_SESSIONS: "Speakers / sessions",
    DEMONSTRATIONS: "Demonstrations",
    FINANCING_SUPPORT: "Information on financing / support",
    NETWORKING: "Networking with other participants",
    OTHER: "Other",
  },
};

const matchChoice = async (participant, text, options) => {
  const normalized = normalize(text);
  const entries = Object.entries(options);
  if (!normalized) return null;
  const numeric = Number.parseInt(normalized, 10);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= entries.length && String(numeric) === normalized) return entries[numeric - 1][0];
  const labels = entries.map(([, label]) => label);
  let localizedLabels = labels;
  try { localizedLabels = await googleTranslation.translateTexts(labels, participant.preferredLanguage || "mr"); } catch { localizedLabels = labels; }
  for (let i=0;i<entries.length;i+=1) {
    const [key, english] = entries[i];
    const candidates=[english,localizedLabels[i]||english,key.replaceAll("_"," ")].map(normalize);
    if(candidates.some(c=>c===normalized||c.includes(normalized)||normalized.includes(c))) return key;
  }
  return null;
};

const sendSupportSolutionDetails = async ({ participant, solutionKey }) => {
  const label = POST_EVENT_OPTIONS.support[solutionKey] || solutionKey;
  const keys=[solutionKey,solutionKey.replaceAll("_"," "),label,label.replaceAll("/"," ")].map(normalize);
  const [vendors,schemes]=await Promise.all([Vendor.find({status:"ACTIVE"}).limit(250).lean(),GovernmentScheme.find({status:"ACTIVE",isDeleted:false}).limit(250).lean()]);
  const matches=(values)=>values.filter(Boolean).some(v=>{const c=normalize(v);return keys.some(k=>c===k||c.includes(k)||k.includes(c));});
  const matchedVendors=vendors.filter(v=>matches([v.valueChain,v.secondaryValueChain,...(v.relatedFields?.interests||[]),...(v.relatedFields?.participantCategories||[])])).slice(0,5);
  const matchedSchemes=schemes.filter(v=>matches([v.category,v.schemeType,...(v.relatedFields?.interests||[]),...(v.relatedFields?.participantCategories||[])])).slice(0,5);
  const lines=[`Support selected: ${label}`,""];
  if(matchedVendors.length){lines.push("Relevant solution providers:");matchedVendors.forEach((v,i)=>{lines.push(`${i+1}. ${v.name}${v.geography?` — ${v.geography}`:""}`);if(v.description)lines.push(v.description);if(v.email)lines.push(`Email: ${v.email}`);if(v.importantLinks?.[0]?.url)lines.push(`More details: ${v.importantLinks[0].url}`);});lines.push("");}
  if(matchedSchemes.length){lines.push("Relevant government support:");matchedSchemes.forEach((v,i)=>{lines.push(`${i+1}. ${v.schemeName}`);if(v.shortDescription)lines.push(v.shortDescription);if(v.applicationLink)lines.push(`Apply: ${v.applicationLink}`);else if(v.officialWebsite)lines.push(`Details: ${v.officialWebsite}`);if(v.helplineNumber)lines.push(`Helpline: ${v.helplineNumber}`);});lines.push("");}
  if(!matchedVendors.length&&!matchedSchemes.length) lines.push("We have recorded your requirement. Our team will share relevant details when a matching provider is available.","");
  lines.push("Did you find a particular solution, technology, or solution provider at the Mela that you want to explore further? Reply with the name, or No.");
  await sendLocalizedText({participant,body:await localized(participant,lines.join("\n")),messageType:"VENDOR_DETAILS",queryType:"INFORMATION_REQUEST",metadata:{supportSolution:solutionKey,vendorIds:matchedVendors.map(v=>v._id),governmentSchemeIds:matchedSchemes.map(v=>v._id)}});
  participant.matchedVendorIds=Array.from(new Set([...(participant.matchedVendorIds||[]).map(String),...matchedVendors.map(v=>String(v._id))])).map(id=>new mongoose.Types.ObjectId(id));
  participant.solutionTracks=[...(participant.solutionTracks||[]),{solution:solutionKey,requirement:label,status:matchedVendors.length||matchedSchemes.length?"MATCHED":"IDENTIFIED",notes:matchedVendors.length||matchedSchemes.length?`Matched ${matchedVendors.length} provider(s) and ${matchedSchemes.length} government support option(s).`:"No direct match found yet.",updatedAt:new Date()}];
  await participant.save();
  return {matchedVendors,matchedSchemes};
};


const processPostEventReply = async ({ participant, text }) => {
  const step = participant.postEventStep || "NONE";
  const normalizedText = normalize(text);

  if (step === "NONE") {
    if (["होय", "yes", "हो"].includes(normalizedText)) {
      participant.postEventStep = "LIVELIHOOD";
      participant.assessmentStatus = "IN_PROGRESS";
      participant.followUpRequired = true;

      await participant.save();

      await sendLocalizedText({
        participant,
        body: `तुमच्या उपजीविकेचा मुख्य प्रकार कोणता आहे?

1. शेती
2. पशुपालन
3. सूक्ष्म व्यवसाय / छोटा व्यवसाय
4. इतर`,
        messageType: "REQUIREMENT_QUESTION",
        queryType: "POST_EVENT",
      });

      return true;
    }

    if (["नाही", "no", "नको"].includes(normalizedText)) {
      participant.postEventStep = "COMPLETED";
      participant.followUpRequired = false;

      await participant.save();

      await sendLocalizedText({
        participant,
        body: "ठीक आहे. तुमचा वेळ दिल्याबद्दल धन्यवाद!",
        queryType: "POST_EVENT",
      });

      return true;
    }

    return true;
  }

  if (step === "COMPLETED") return false;

  // Q2: Support / Solution
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

    participant.livelihoodCategories = Array.from(
      new Set([
        ...(participant.livelihoodCategories || []),
        value,
      ])
    );

    participant.postEventStep = "SUPPORT";
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

  // Q3: Specific support
  if (step === "SUPPORT") {
    const value = await matchChoice(
      participant,
      text,
      POST_EVENT_OPTIONS.support
    );

    if (!value) {
      await sendLocalizedText({
        participant,
        body: `कृपया खालीलपैकी एका मदतीचा क्रमांक किंवा नाव पाठवा:

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

    participant.supportSolutions = Array.from(
      new Set([
        ...(participant.supportSolutions || []),
        value,
      ])
    );

    participant.postEventStep = "SPECIFIC_SOLUTION";
    participant.followUpRequired = true;

    await participant.save();

    await sendSupportSolutionDetails({
      participant,
      solutionKey: value,
    });

    return true;
  }

  // Q4: Specific solution / provider
  if (step === "SPECIFIC_SOLUTION") {
    participant.specificSolutionProviderInterested =
      normalizedText !== "no" &&
      normalizedText !== "नाही" &&
      normalizedText !== "नहीं";

    participant.specificSolutionProviderInterest =
      participant.specificSolutionProviderInterested
        ? text.trim()
        : "";

    participant.postEventStep = "NEXT_ACTION";

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

  // Q5: Next action
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

    participant.nextActions = Array.from(
      new Set([
        ...(participant.nextActions || []),
        value,
      ])
    );

    participant.postEventStep = "USEFUL";

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
8. इतर`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  // Q6: What was useful
  if (step === "USEFUL") {
    const values = text
      .split(/[,|]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const matched = [];

    for (const value of values) {
      const key = await matchChoice(
        participant,
        value,
        POST_EVENT_OPTIONS.useful
      );

      if (key) matched.push(key);
    }

    if (!matched.length) {
      await sendLocalizedText({
        participant,
        body: `कृपया मेळ्यात तुम्हाला काय उपयुक्त वाटले ते सांगा.

उदा. तंत्रज्ञान / यंत्रसामग्री, सौर ऊर्जा, उपाय प्रदाते, प्रात्यक्षिके, वित्तपुरवठा / सहाय्य किंवा नेटवर्किंग.`,
        queryType: "POST_EVENT",
      });

      return true;
    }

    participant.usefulAtMela = Array.from(
      new Set([
        ...(participant.usefulAtMela || []),
        ...matched,
      ])
    );

    participant.postEventStep = "FEEDBACK";

    await participant.save();

    await sendLocalizedText({
      participant,
      body: `मेळ्यात आणखी काय चांगले करता आले असते?

कृपया तुमचा अभिप्राय पाठवा.`,
      queryType: "POST_EVENT",
    });

    return true;
  }

  // Final feedback
  if (step === "FEEDBACK") {
    participant.whatCouldBeBetter = text.trim();
    participant.postEventStep = "COMPLETED";
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

const sendLocalizedText = async ({ participant, body, messageType = "TEXT", queryType = "INFORMATION_REQUEST", metadata = {} }) => {
  const interaction = await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "OUTBOUND",
    method: "BOT",
    messageType,
    queryType,
    message: body,
    status: "PENDING",
    metadata: { ...metadata, language: participant.preferredLanguage || "mr" },
  });
  try {
    const providerResult = await whatsappProvider.sendText({
      to: `${String(participant.countryCode || "+91").replace("+", "")}${participant.mobile}`,
      body,
    });
    interaction.status = "SENT";
    interaction.providerMessageId = providerResult.providerMessageId;
    interaction.sentAt = new Date();
    interaction.metadata = { ...interaction.metadata, providerResponse: providerResult.raw };
    await interaction.save();
    return interaction;
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;
    await interaction.save();
    throw error;
  }
};

const matchValueChainFromMessage = async ({ participantId, text }) => {
  const participant = await getParticipant(participantId);
  const normalized = normalize(text);
  if (!normalized) return null;

  const vendors = await Vendor.find({ status: "ACTIVE" }).limit(200).lean();
  const match = vendors.find((vendor) => [vendor.valueChain, vendor.secondaryValueChain, ...(vendor.relatedFields?.interests || [])]
    .filter(Boolean).some((value) => normalize(value) === normalized || normalize(value).includes(normalized) || normalized.includes(normalize(value))));
  if (!match) return null;

  const valueChain = match.valueChain || match.secondaryValueChain || text.trim();
  participant.valueChains = Array.from(new Set([...(participant.valueChains || []), valueChain]));
  participant.participantStatus = "REQUIREMENT_SELECTED";
  participant.followUpRequired = true;
  participant.lastWhatsAppInteractionAt = new Date();
  await participant.save();

  const matchingVendors = vendors.filter((vendor) => [vendor.valueChain, vendor.secondaryValueChain, ...(vendor.relatedFields?.interests || [])]
    .filter(Boolean).some((value) => normalize(value) === normalize(valueChain) || normalize(value).includes(normalize(valueChain)) || normalize(valueChain).includes(normalize(value)))).slice(0, 10);

  const lines = [
    `You selected: ${valueChain}`,
    "",
    matchingVendors.length ? "Matching solution providers:" : "We are finding matching solution providers for you.",
    ...matchingVendors.map((vendor, index) => `${index + 1}. ${vendor.name}${vendor.geography ? ` — ${vendor.geography}` : ""}`),
  ];
  await sendLocalizedText({ participant, body: lines.join("\\n"), messageType: "VENDOR_DETAILS", queryType: "VALUE_CHAIN_SELECTION", metadata: { valueChain, vendorIds: matchingVendors.map((v) => v._id) } });
  return { valueChain, vendors: matchingVendors };
};

const sendRequirementInformation = async ({
  participantId,
  requirementId,
}) => {
  const result = await selectRequirement({
    participantId,
    requirementId,
    method: "BOT",
  });

  const body = buildInformationMessage(result);
  const interaction = await WhatsAppInteraction.create({
    participant: result.participant._id,
    mobile: result.participant.mobile,
    direction: "OUTBOUND",
    method: "BOT",
    messageType: "VENDOR_DETAILS",
    queryType: "INFORMATION_REQUEST",
    message: body,
    selectedRequirement: result.requirement._id,
    matchedVendors: result.vendors.map((item) => item._id),
    matchedGovernmentSchemes: result.governmentSchemes.map(
      (item) => item._id
    ),
    status: "PENDING",
  });

  try {
    const providerResult = await whatsappProvider.sendText({
      to: result.participant.countryCode
        ? `${result.participant.countryCode.replace("+", "")}${result.participant.mobile}`
        : result.participant.mobile,
      body,
    });

    interaction.status = "SENT";
    interaction.providerMessageId =
      providerResult.providerMessageId;
    interaction.sentAt = new Date();
    await interaction.save();

    if (result.vendors.length) {
      result.participant.participantStatus = "VENDOR_SHARED";
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
    interaction.errorMessage = error.message;
    await interaction.save();
    throw error;
  }
};

const sendAdminMessage = async ({
  participantId,
  message,
  staffId,
}) => {
  const participant = await getParticipant(participantId);

  const interaction = await WhatsAppInteraction.create({
    participant: participant._id,
    mobile: participant.mobile,
    direction: "OUTBOUND",
    method: "ADMIN",
    messageType: "TEXT",
    queryType: "FOLLOW_UP",
    message,
    status: "PENDING",
    metadata: { sentBy: String(staffId) },
  });

  try {
    const providerResult = await whatsappProvider.sendText({
      to: `${participant.countryCode.replace("+", "")}${participant.mobile}`,
      body: message,
    });

    interaction.status = "SENT";
    interaction.providerMessageId =
      providerResult.providerMessageId;
    interaction.sentAt = new Date();
    await interaction.save();

    participant.whatsappStatus = "CONTACTED";
    participant.participantStatus = "WHATSAPP_CONTACTED";
    participant.lastWhatsAppInteractionAt = new Date();
    await participant.save();

    return interaction;
  } catch (error) {
    interaction.status = "FAILED";
    interaction.errorMessage = error.message;
    await interaction.save();
    throw error;
  }
};

const bulkSend = async ({
  participantIds,
  message,
  staffId,
}) => {
  if (!Array.isArray(participantIds) || !participantIds.length) {
    throw new ApiError(400, "At least one participant is required.");
  }

  const results = [];

  for (const participantId of participantIds) {
    try {
      const interaction = await sendAdminMessage({
        participantId,
        message,
        staffId,
      });
      results.push({
        participantId,
        success: true,
        interactionId: interaction._id,
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
    sent: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
};

const getParticipantInteractions = async (participantId) => {
  return WhatsAppInteraction.find({
    participant: participantId,
  })
    .populate("selectedRequirement", "name")
    .populate("matchedVendors", "name geography")
    .populate(
      "matchedGovernmentSchemes",
      "schemeName category"
    )
    .sort({ createdAt: -1 })
    .lean();
};

const handleWebhookMessage = async (payload) => {
  // Gupshup v2 webhook payloads use {type:"message", payload:{source,type,payload}} and
  // {type:"message-event", payload:{id,type,destination}}. See Gupshup inbound/message-event docs.
  if (env.whatsapp.provider === "gupshup" && payload?.version === 2) {
    if (payload.type === "message-event") {
      const event = payload.payload || {};
      const providerMessageId = event.gsId || event.id;
      const mapped = { enqueued: "PENDING", failed: "FAILED", sent: "SENT", delivered: "DELIVERED", read: "READ" }[event.type];
      if (providerMessageId && mapped) {
        await WhatsAppInteraction.findOneAndUpdate(
          { providerMessageId },
          { $set: { status: mapped, ...(mapped === "SENT" ? { sentAt: new Date() } : {}), ...(mapped === "FAILED" ? { errorMessage: event.payload?.reason || "Gupshup delivery failed." } : {}) } },
          { new: true }
        );
      }
      return;
    }

    if (payload.type === "message") {
      const message = payload.payload || {};
      if (message.type === "request_welcome") return;
      const mobile = String(message.source || message.sender?.phone || "").replace(/\D/g, "");
      const participant = await Participant.findOne({ mobile: mobile.slice(-10), isDeleted: false });
      if (!participant) return;
      let text = "";
      if (message.type === "text" || message.type === "txt") text = String(message.payload?.text || message.payload || "").trim();
      if (message.type === "button_reply" || message.type === "list_reply") text = String(message.payload?.title || message.payload?.text || message.payload?.postbackText || message.payload?.id || "").trim();
      if (!text && message.payload?.type === "button") text = String(message.payload?.text || "").trim();
      const providerMessageId = message.id || message.payload?.id || null;
      const existing = providerMessageId ? await WhatsAppInteraction.findOne({ providerMessageId }).select("_id") : null;
      if (existing) return;
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
        externalMessageKey: providerMessageId,
        metadata: payload,
      });
      participant.whatsappStatus = "ACTIVE";
      participant.lastWhatsAppInteractionAt = new Date();
      if (!participant.postEventStep || participant.postEventStep === "NONE") participant.postEventStep = "LIVELIHOOD";
      participant.participantStatus = classifyParticipantResponse(text);
      participant.followUpRequired = participant.participantStatus !== "PROBLEM_SOLVED";
      await participant.save();
      if (await processPostEventReply({ participant, text })) return;
      const selectedRequirement = await getRequirementOptions().then((requirements) => requirements.find((item) => [item.name, ...(item.keywords || [])].some((candidate) => normalize(candidate) === normalize(text))));
      if (selectedRequirement) {
        await sendRequirementInformation({ participantId: participant._id, requirementId: selectedRequirement._id });
      } else {
        await matchValueChainFromMessage({ participantId: participant._id, text });
      }
      return;
    }
  }

  const entries = payload?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;

      await handleWebhookStatuses(value?.statuses || []);

      const messages = value?.messages || [];

      for (const message of messages) {
        const mobile = message.from;
        const text =
          message?.text?.body?.trim() || "";

        const participant = await Participant.findOne({
          mobile: mobile.slice(-10),
          isDeleted: false,
        });

        if (!participant) continue;

        await WhatsAppInteraction.create({
          participant: participant._id,
          mobile: participant.mobile,
          direction: "INBOUND",
          method: "WEBHOOK",
          messageType: "TEXT",
          queryType: "SUPPORT_REQUEST",
          message: text,
          status: "RECEIVED",
          providerMessageId: message.id,
          metadata: message,
        });

        participant.whatsappStatus = "ACTIVE";
        participant.lastWhatsAppInteractionAt = new Date();
        participant.participantStatus = classifyParticipantResponse(text);
        participant.followUpRequired = participant.participantStatus !== "PROBLEM_SOLVED";
        await participant.save();

        const requirements =
          await getRequirementOptions();

        const selected = requirements.find((item) =>
          [item.name, ...(item.keywords || [])]
            .some((candidate) =>
              normalize(candidate) === normalize(text)
            )
        );

        if (selected) {
          await sendRequirementInformation({
            participantId: participant._id,
            requirementId: selected._id,
          });
        }
      }
    }
  }
};

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
