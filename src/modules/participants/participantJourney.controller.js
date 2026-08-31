import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import participantJourneyService from "./participantJourney.service.js";

const getAssessment = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.getAssessment(
    req.params.id
  );

  return ApiResponse.success(
    res,
    "Participant assessment fetched successfully.",
    data
  );
});

const updateAssessment = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.updateAssessment(
    req.params.id,
    req.body
  );

  return ApiResponse.success(
    res,
    "Participant assessment updated successfully.",
    data
  );
});

const getSolutionDesign = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.getSolutionDesign(
    req.params.id
  );

  return ApiResponse.success(
    res,
    "Solution and design fetched successfully.",
    data
  );
});

const updateSolutionDesign = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.updateSolutionDesign(
    req.params.id,
    req.body
  );

  return ApiResponse.success(
    res,
    "Solution and design updated successfully.",
    data
  );
});

const addIntervention = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.addIntervention(
    req.params.id,
    req.body
  );

  return ApiResponse.success(
    res,
    "Intervention added successfully.",
    data
  );
});

const updateIntervention = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.updateIntervention(
    req.params.id,
    req.params.interventionId,
    req.body
  );

  return ApiResponse.success(
    res,
    "Intervention updated successfully.",
    data
  );
});

const getImplementation = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.getImplementation(
    req.params.id
  );

  return ApiResponse.success(
    res,
    "Implementation data fetched successfully.",
    data
  );
});

const createImplementation = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.createImplementation(
    req.params.id,
    req.params.interventionId
  );

  return ApiResponse.success(
    res,
    "Implementation record created successfully.",
    data
  );
});

const updateImplementation = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.updateImplementation(
    req.params.id,
    req.params.implementationId,
    req.body
  );

  return ApiResponse.success(
    res,
    "Implementation updated successfully.",
    data
  );
});


const uploadAssessmentDocuments = asyncHandler(async (req, res) => {
  const data = await participantJourneyService.uploadAssessmentDocuments(
    req.params.id,
    req.body.docType,
    req.files
  );

  return ApiResponse.success(
    res,
    "Assessment documents uploaded successfully.",
    data
  );
});

const deleteAssessmentDocument = asyncHandler(async (req, res) => {
  const data =
    await participantJourneyService.deleteAssessmentDocument(
      req.params.id,
      req.body.docType,
      req.body.fileKey
    );

  return ApiResponse.success(
    res,
    "Assessment document deleted successfully.",
    data
  );
});

export default {
  getAssessment,
  updateAssessment,
  uploadAssessmentDocuments,
  deleteAssessmentDocument ,

  getSolutionDesign,
  updateSolutionDesign,
  addIntervention,
  updateIntervention,

  getImplementation,
  createImplementation,
  updateImplementation,
};