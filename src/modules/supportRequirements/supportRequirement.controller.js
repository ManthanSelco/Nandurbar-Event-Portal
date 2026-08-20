import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import service from "./supportRequirement.service.js";

const create = asyncHandler(async (req, res) => {
  const item = await service.create(req.body, req.staff._id);
  return ApiResponse.success(
    res,
    "Support requirement created successfully.",
    item,
    201
  );
});

const list = asyncHandler(async (req, res) => {
  const items = await service.list({
    activeOnly: req.query.activeOnly === "true",
  });
  return ApiResponse.success(
    res,
    "Support requirements fetched successfully.",
    items
  );
});

const getById = asyncHandler(async (req, res) => {
  const item = await service.getById(req.params.id);
  return ApiResponse.success(
    res,
    "Support requirement fetched successfully.",
    item
  );
});

const update = asyncHandler(async (req, res) => {
  const item = await service.update(
    req.params.id,
    req.body,
    req.staff._id
  );
  return ApiResponse.success(
    res,
    "Support requirement updated successfully.",
    item
  );
});

const remove = asyncHandler(async (req, res) => {
  const item = await service.remove(
    req.params.id,
    req.staff._id
  );
  return ApiResponse.success(
    res,
    "Support requirement deactivated successfully.",
    item
  );
});

export default { create, list, getById, update, remove };
