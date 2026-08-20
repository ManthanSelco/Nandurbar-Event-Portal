import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import questionService from "./participantQuestion.service.js";

const createQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.createQuestion(
    req.body,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Question created successfully.",
    question
  );
});

const getAllQuestions = asyncHandler(async (req, res) => {
  const questions = await questionService.getAllQuestions();

  return ApiResponse.success(
    res,
    "Questions fetched successfully.",
    questions
  );
});

const getRegistrationQuestions = asyncHandler(async (req, res) => {
  const questions = await questionService.getRegistrationQuestions(
    req.query.language || "mr"
  );

  return ApiResponse.success(
    res,
    "Registration questions fetched successfully.",
    questions
  );
});

const getQuestionById = asyncHandler(async (req, res) => {
  const question = await questionService.getQuestionById(
    req.params.id
  );

  return ApiResponse.success(
    res,
    "Question fetched successfully.",
    question
  );
});

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.updateQuestion(
    req.params.id,
    req.body,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Question updated successfully.",
    question
  );
});

const changeStatus = asyncHandler(async (req, res) => {
  const question = await questionService.changeQuestionStatus(
    req.params.id,
    req.body.isActive,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Question status updated successfully.",
    question
  );
});

const deleteQuestion = asyncHandler(async (req, res) => {
  await questionService.deleteQuestion(
    req.params.id,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Question deactivated successfully.",
    null
  );
});

export default {
  createQuestion,
  getAllQuestions,
  getRegistrationQuestions,
  getQuestionById,
  updateQuestion,
  changeStatus,
  deleteQuestion,
};
