import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import staffService from "./staff.service.js";

const createStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(
    req.body,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Staff created successfully.",
    staff,
    201
  );
});

const getAllStaff = asyncHandler(async (req, res) => {
  const result = await staffService.getAllStaff(req.query);

  return ApiResponse.success(
    res,
    "Staff fetched successfully.",
    result
  );
});

const getStaffById = asyncHandler(async (req, res) => {
  const staff = await staffService.getStaffById(req.params.id);

  return ApiResponse.success(
    res,
    "Staff details fetched successfully.",
    staff
  );
});

const updateStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(
    req.params.id,
    req.body,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Staff updated successfully.",
    staff
  );
});

const changeStatus = asyncHandler(async (req, res) => {
  const staff = await staffService.changeStatus(
    req.params.id,
    req.body.isActive,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Staff status updated successfully.",
    staff
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  await staffService.resetPassword(
    req.params.id,
    req.body.password,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Password reset successfully."
  );
});

const deleteStaff = asyncHandler(async (req, res) => {
  await staffService.deleteStaff(
    req.params.id,
    req.staff._id
  );

  return ApiResponse.success(
    res,
    "Staff deleted successfully."
  );
});

export default {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  changeStatus,
  resetPassword,
  deleteStaff,
};