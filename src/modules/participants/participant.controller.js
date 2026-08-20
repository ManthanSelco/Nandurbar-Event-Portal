import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import participantService from "./participant.service.js";
import participantRegistrationService from "./participantRegistration.service.js";

const sendOtp = asyncHandler(async (req, res) => {
  const data = await participantRegistrationService.sendOtp(req.body);

  return ApiResponse.success(res, "OTP sent successfully.", data);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const data = await participantRegistrationService.verifyOtp(req.body);

  return ApiResponse.success(
    res,
    "Mobile number verified successfully.",
    data
  );
});

const createParticipant = asyncHandler(async (req, res) => {
  const participant = await participantService.createParticipant(req.body);

  return ApiResponse.success(
    res,
    "Participant registered successfully.",
    participant
  );
});

const getParticipants = asyncHandler(async (req, res) => {
  const data = await participantService.getParticipants(req.query);
  return ApiResponse.success(
    res,
    "Participants fetched successfully.",
    data
  );
});

const getStats = asyncHandler(async (req, res) => { const data = await participantService.getStats(); return ApiResponse.success(res, "Participant statistics fetched successfully.", data); });

const updateParticipant = asyncHandler(async (req, res) => {
  const data = await participantService.updateParticipant(req.params.id, req.body);
  return ApiResponse.success(res, "Participant updated successfully.", data);
});

const getParticipantById = asyncHandler(async (req, res) => {
  const data = await participantService.getParticipantById(
    req.params.id
  );
  return ApiResponse.success(
    res,
    "Participant fetched successfully.",
    data
  );
});

const createVolunteerParticipant = asyncHandler(async (req, res) => {
  const volunteerToken = req.headers["x-volunteer-token"];
  const participant = await participantService.createVolunteerParticipant(req.body, volunteerToken);

  return ApiResponse.success(
    res,
    "Participant registered successfully by volunteer.",
    participant
  );
});

export default {
  sendOtp,
  verifyOtp,
  createParticipant,
  createVolunteerParticipant,
  getParticipants,
  getStats,
  getParticipantById,
  updateParticipant,
};
