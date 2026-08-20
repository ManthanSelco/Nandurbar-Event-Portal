import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import volunteerRegistrationService from "./volunteerRegistration.service.js";

const createVolunteerLink = asyncHandler(async (req, res) => {
  const data =
    await volunteerRegistrationService.createVolunteerLink(
      req.body,
      req.staff._id
    );

  return ApiResponse.success(
    res,
    "Volunteer registration link created successfully.",
    data
  );
});

export default {
  createVolunteerLink,
};
