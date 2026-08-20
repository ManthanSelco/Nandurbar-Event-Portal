import ParticipantQuestion from "./participantQuestion.model.js";
import ApiError from "../../shared/errors/ApiError.js";
import googleTranslation from "../../shared/translation/googleTranslation.service.js";

const translationCache = new Map();
const TRANSLATION_CACHE_MS = 10 * 60 * 1000;

const createQuestion = async (payload, createdBy) => {
  // If the admin does not provide an order, append the question automatically.
  const last = await ParticipantQuestion.findOne()
    .sort({ displayOrder: -1 })
    .select("displayOrder")
    .lean();

  const displayOrder =
    Number.isInteger(payload.displayOrder) && payload.displayOrder > 0
      ? payload.displayOrder
      : Number(last?.displayOrder || 0) + 1;

  // Keep ordering unique and predictable when an explicit order is supplied.
  if (payload.displayOrder) {
    await ParticipantQuestion.updateMany(
      { displayOrder: { $gte: displayOrder } },
      { $inc: { displayOrder: 1 } }
    );
  }

  const created = await ParticipantQuestion.create({
    ...payload,
    displayOrder,
    createdBy,
  });
  translationCache.clear();
  return created;
};

const getAllQuestions = async () => {
  return ParticipantQuestion.find()
    .sort({
      displayOrder: 1,
      createdAt: 1,
    })
    .lean();
};

const getRegistrationQuestions = async (language = "mr") => {
  const normalizedLanguage = String(language || "mr").toLowerCase();

  if (!googleTranslation.supportedLanguages.includes(normalizedLanguage)) {
    throw new ApiError(400, "Supported languages are en, hi, mr and gu.");
  }

  const questions = await ParticipantQuestion.find({ isActive: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select("question type options required minWords maxWords displayOrder updatedAt")
    .lean();

  if (normalizedLanguage === "en") return questions.map((item) => ({ ...item, options: (item.options || []).map((value) => ({ value, label: value })), language: "en" }));

  const cacheKey = `${normalizedLanguage}:${questions.map((q) => `${q._id}:${q.updatedAt || ""}`).join(",")}`;
  const cached = translationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const sourceTexts = questions.flatMap((item) => [item.question, ...(item.options || [])]);
  const translatedTexts = await googleTranslation.translateTexts(sourceTexts, normalizedLanguage);
  let cursor = 0;
  const result = questions.map((item) => {
    const translatedQuestion = translatedTexts[cursor] || item.question;
    cursor += 1;
    const translatedOptions = (item.options || []).map((option) => {
      const label = translatedTexts[cursor] || option;
      cursor += 1;
      return { value: option, label };
    });
    return { ...item, question: translatedQuestion, options: translatedOptions, language: normalizedLanguage };
  });

  translationCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + TRANSLATION_CACHE_MS,
  });

  return result;
};

const getQuestionById = async (
  questionId
) => {
  const question =
    await ParticipantQuestion.findById(
      questionId
    );

  if (!question) {
    throw new ApiError(
      404,
      "Question not found."
    );
  }

  return question;
};

const updateQuestion = async (
  questionId,
  payload,
  updatedBy
) => {
  const question =
    await ParticipantQuestion.findById(
      questionId
    );

  if (!question) {
    throw new ApiError(
      404,
      "Question not found."
    );
  }

  const oldOrder = question.displayOrder;
  const nextOrder = payload.displayOrder;

  if (nextOrder && nextOrder !== oldOrder) {
    if (nextOrder < oldOrder) {
      await ParticipantQuestion.updateMany(
        {
          _id: { $ne: question._id },
          displayOrder: { $gte: nextOrder, $lt: oldOrder },
        },
        { $inc: { displayOrder: 1 } }
      );
    } else {
      await ParticipantQuestion.updateMany(
        {
          _id: { $ne: question._id },
          displayOrder: { $gt: oldOrder, $lte: nextOrder },
        },
        { $inc: { displayOrder: -1 } }
      );
    }
  }

  Object.assign(question, payload);
  question.updatedBy = updatedBy;
  await question.save();
  translationCache.clear();

  return question;
};

const changeQuestionStatus = async (
  questionId,
  isActive,
  updatedBy
) => {
  const question =
    await ParticipantQuestion.findById(
      questionId
    );

  if (!question) {
    throw new ApiError(
      404,
      "Question not found."
    );
  }

  question.isActive = isActive;
  question.updatedBy = updatedBy;

  await question.save();
  translationCache.clear();

  return question;
};

const deleteQuestion = async (
  questionId,
  updatedBy
) => {
  const question =
    await ParticipantQuestion.findById(
      questionId
    );

  if (!question) {
    throw new ApiError(
      404,
      "Question not found."
    );
  }

  // Soft delete
  question.isActive = false;
  question.updatedBy = updatedBy;

  await question.save();
  translationCache.clear();

  return null;
};

export default {
  createQuestion,
  getAllQuestions,
  getRegistrationQuestions,
  getQuestionById,
  updateQuestion,
  changeQuestionStatus,
  deleteQuestion,
};