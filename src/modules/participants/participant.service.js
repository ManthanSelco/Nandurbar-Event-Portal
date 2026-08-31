import mongoose from "mongoose";
import Participant from "./participant.model.js";
import ParticipantQuestion from "./participantQuestion.model.js";
import RegistrationRequest from "./registrationRequest.model.js";
import volunteerRegistrationService from "./volunteerRegistration.service.js";
import WhatsAppJob from "../whatsapp/whatsappJob.model.js";
import ApiError from "../../shared/errors/ApiError.js";
import env from "../../config/env.js";

const SUPPORTED_LANGUAGES = ["en", "hi", "mr", "gu"];

const countWords = (text = "") =>
  text.trim().split(/\s+/).filter(Boolean).length;

const normalizeMobile = (mobile) =>
  String(mobile || "").replace(/\D/g, "").slice(-10);

const normalizeLanguage = (language) => {
  const value = String(language || "mr").toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(value)) {
    throw new ApiError(400, "Supported languages are English, Hindi, Marathi and Gujarati.");
  }
  return value;
};

const validateAnswers = async (answers = []) => {
  const questions = await ParticipantQuestion.find({ isActive: true }).sort({
    displayOrder: 1,
  });

  const map = new Map(answers.map((x) => [String(x.questionId), x]));

  for (const q of questions) {
    const raw = map.get(String(q._id))?.answer;
    const answer = Array.isArray(raw) ? raw : String(raw ?? "").trim();
    if ((Array.isArray(answer) ? answer.length === 0 : !answer) && q.required) {
      throw new ApiError(400, `Answer required for question: ${q.question}`);
    }
    if (["SELECT", "MULTI_SELECT"].includes(q.type) && answer) {
      const values = Array.isArray(answer) ? answer : String(answer).split("|").map((v) => v.trim()).filter(Boolean);
      const invalid = values.some((v) => !(q.options || []).includes(v));
      if (invalid) throw new ApiError(400, `Invalid option selected for question: ${q.question}`);
    }
  }

  for (const a of answers) {
    const q = questions.find((x) => String(x._id) === String(a.questionId));
    if (!q) throw new ApiError(400, "Invalid question ID.");

    const n = countWords(Array.isArray(a.answer) ? a.answer.join(" ") : a.answer);
    if (n < q.minWords) {
      throw new ApiError(
        400,
        `Answer for "${q.question}" must contain at least ${q.minWords} words.`
      );
    }
    if (n > q.maxWords) {
      throw new ApiError(
        400,
        `Answer for "${q.question}" cannot exceed ${q.maxWords} words.`
      );
    }
  }
};

const consent = (value) => {
  if (value !== true) throw new ApiError(400, "Consent is required.");
};

const existing = async (id) => {
  if (!id) return null;
  const result = await RegistrationRequest.findOne({ requestId: id }).populate(
    "participantId"
  );
  return result?.participantId || null;
};

const duplicate = async (mobile) => {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return;
  const participant = await Participant.findOne({
    mobile: normalized,
    isDeleted: false,
  });
  if (participant) {
    throw new ApiError(409, "A participant with this mobile number already exists.");
  }
};

const enqueueWelcome = async (participant) => {
  if (!env.whatsapp.enabled || !participant.mobile || !participant.whatsappAvailable) return;

  try {
    const job = await WhatsAppJob.create({
      type: "WELCOME_TEMPLATE",
      participant: participant._id,
      status: "QUEUED",
    });

    console.log(
      `[whatsapp-queue] welcome queued job=${job._id} participant=${participant._id} mobile=${participant.mobile}`
    );
  } catch (error) {
    // Duplicate job is safe/idempotent. Other queue errors must not make the
    // participant registration fail after MongoDB has already committed it.
    if (error?.code !== 11000) {
      console.error("[whatsapp-queue] unable to enqueue welcome message:", error.message);
    }
  }
};

const createParticipant = async (payload) => {
  const old = await existing(payload.requestId);
  if (old) return old;

  const mobile = normalizeMobile(payload.mobile);
  const preferredLanguage = normalizeLanguage(payload.preferredLanguage);

  await duplicate(mobile);
  await validateAnswers(payload.answers);
  consent(payload.consentGiven);

  let participant;

  try {
    participant = await Participant.create({
      ...payload,
      mobile: mobile || null,
      preferredLanguage,
      registrationRequestId: payload.requestId,
      mobileVerified: false,
      mobileVerificationMethod: "NONE",
      registrationMethod: "SELF_QR",
      registeredBy: null,
      participantStatus: "REGISTERED",
      whatsappStatus: payload.whatsappAvailable ? "PENDING" : "NOT_AVAILABLE",
    });
  } catch (error) {
    if (error?.code === 11000) {
      const old2 = await existing(payload.requestId);
      if (old2) return old2;
      throw new ApiError(409, "A participant with this mobile number already exists.");
    }
    throw error;
  }

  try {
    await RegistrationRequest.create({
      requestId: payload.requestId,
      participantId: participant._id,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateRequest = await existing(payload.requestId);
      if (duplicateRequest) return duplicateRequest;
    }
    throw error;
  }

  await enqueueWelcome(participant);
  return participant;
};

const createVolunteerParticipant = async (payload, token) => {
  const old = await existing(payload.requestId);
  if (old) return old;

  const preferredLanguage = normalizeLanguage(payload.preferredLanguage);
  const mobile = normalizeMobile(payload.mobile);
  const volunteer = await volunteerRegistrationService.reserveRegistrationSlot(token);

  try {
    await duplicate(mobile);
    await validateAnswers(payload.answers);
    consent(payload.consentGiven);

    const participant = await Participant.create({
      ...payload,
      mobile: mobile || null,
      preferredLanguage,
      registrationRequestId: payload.requestId,
      mobileVerified: false,
      mobileVerificationMethod: "NONE",
      registrationMethod: "VOLUNTEER",
      registeredBy: volunteer.createdBy,
      volunteerName: volunteer.volunteerName,
      volunteerMobile: volunteer.volunteerMobile,
      participantStatus: "REGISTERED",
      whatsappStatus: payload.whatsappAvailable ? "PENDING" : "NOT_AVAILABLE",
    });

    await RegistrationRequest.create({
      requestId: payload.requestId,
      participantId: participant._id,
    });

    await enqueueWelcome(participant);
    return participant;
  } catch (error) {
    await volunteerRegistrationService.releaseRegistrationSlot(token);

    if (error?.code === 11000) {
      const old2 = await existing(payload.requestId);
      if (old2) return old2;
      throw new ApiError(409, "A participant with this mobile number already exists.");
    }

    throw error;
  }
};

const getParticipants = async (q = {}) => {
  const page = Math.max(Number(q.page || 1), 1);
  const limit = Math.min(Math.max(Number(q.limit || 50), 1), 200);
  const filter = { isDeleted: false };

  if (q.search) {
    const safe = String(q.search).trim();
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { mobile: { $regex: safe, $options: "i" } },
      { location: { $regex: safe, $options: "i" } },
      { occupation: { $regex: safe, $options: "i" } },
    ];
  }

  if (q.registrationMethod) filter.registrationMethod = q.registrationMethod;
  if (q.participantStatus) filter.participantStatus = q.participantStatus;
  if (q.whatsappStatus) filter.whatsappStatus = q.whatsappStatus;
  if (q.preferredLanguage) filter.preferredLanguage = q.preferredLanguage;
  if (q.organizationType) filter.organizationType = q.organizationType;
  if (q.sector) filter.sector = q.sector;
  if (q.livelihoodCategory) filter.livelihoodCategories = q.livelihoodCategory;
  if (q.solution) filter.supportSolutions = q.solution;
  if (q.assessmentStatus) filter.assessmentStatus = q.assessmentStatus;
  if (q.implementationStatus) filter.implementationStatus = q.implementationStatus;
  if (q.solutionStatus) filter["solutionTracks.status"] = q.solutionStatus;
  if (q.providerId && mongoose.Types.ObjectId.isValid(q.providerId)) filter["solutionTracks.providerId"] = q.providerId;

  const [participants, total] = await Promise.all([
    Participant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Participant.countDocuments(filter),
  ]);

  return {
    participants,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getParticipantById = async (id) => {
  const participant = await Participant.findOne({ _id: id, isDeleted: false }).lean();
  if (!participant) throw new ApiError(404, "Participant not found.");
  return participant;
};

const getStats = async () => {
  const match = { isDeleted: false };
  const [total, mobileProvided, volunteer, selfQr, today, bySolution, bySector, byLivelihood, byImplementation, byAssessment, bySolutionStatus] = await Promise.all([
    Participant.countDocuments(match),
    Participant.countDocuments({ ...match, mobile: { $type: "string" } }),
    Participant.countDocuments({ ...match, registrationMethod: "VOLUNTEER" }),
    Participant.countDocuments({ ...match, registrationMethod: "SELF_QR" }),
    (() => { const start = new Date(); start.setHours(0,0,0,0); return Participant.countDocuments({ ...match, createdAt: { $gte: start } }); })(),
    Participant.aggregate([{ $match: match }, { $unwind: "$supportSolutions" }, { $group: { _id: "$supportSolutions", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Participant.aggregate([{ $match: match }, { $group: { _id: "$sector", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Participant.aggregate([{ $match: match }, { $unwind: "$livelihoodCategories" }, { $group: { _id: "$livelihoodCategories", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Participant.aggregate([{ $match: match }, { $group: { _id: "$implementationStatus", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Participant.aggregate([{ $match: match }, { $group: { _id: "$assessmentStatus", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Participant.aggregate([{ $match: match }, { $unwind: "$solutionTracks" }, { $group: { _id: "$solutionTracks.status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);
  return { total, mobileProvided, volunteer, selfQr, today, bySolution, bySector, byLivelihood, byImplementation, byAssessment, bySolutionStatus };
};

const updateParticipant = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid participant ID.");
  const participant = await Participant.findOne({ _id: id, isDeleted: false });
  if (!participant) throw new ApiError(404, "Participant not found.");

  if (Array.isArray(payload.supportSolutions)) {
    const existingTracks = participant.solutionTracks || [];
    const existingKeys = new Set(existingTracks.map((track) => track.solution));
    for (const solution of payload.supportSolutions) {
      if (!existingKeys.has(solution)) existingTracks.push({ solution, status: "IDENTIFIED", updatedAt: new Date() });
    }
    payload.solutionTracks = existingTracks;
  }

  Object.assign(participant, payload);
  await participant.save();
  return participant.toObject();

};


const deleteParticipant = async (id, deletedBy) => {
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

  participant.isDeleted = true;
  participant.deletedBy = deletedBy;
  participant.deletedAt = new Date();

  await participant.save();

  return {
    id: participant._id,
    deleted: true,
  };
};

export default {
  createParticipant,
  createVolunteerParticipant,
  getParticipants,
  getParticipantById,
  getStats,
  updateParticipant,
  deleteParticipant,
};
