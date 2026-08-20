import asyncHandler from "../../middleware/asyncHandler.js";
import ApiResponse from "../../shared/responses/apiResponse.js";
import governmentSchemeService from "./governmentScheme.service.js";
import {
  createGovernmentSchemeSchema,
  updateGovernmentSchemeSchema,
} from "./governmentScheme.validation.js";

const createScheme = asyncHandler(
  async (req, res) => {
    const { success, data, error } =
      createGovernmentSchemeSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: "Invalid government scheme data.",
        errors: error.flatten(),
      });
    }

    const scheme =
      await governmentSchemeService.createScheme({
        data,
        staffId: req.staff._id,
      });

    return ApiResponse.success(
      res,
      "Government scheme created successfully.",
      scheme,
      201
    );
  }
);

const getSchemes = asyncHandler(
  async (req, res) => {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      category,
    } = req.query;

    const result =
      await governmentSchemeService.getSchemes({
        page: Number(page),
        limit: Number(limit),
        search,
        status,
        category,
      });

    return ApiResponse.success(
      res,
      "Government schemes fetched successfully.",
      result
    );
  }
);

const getSchemeById = asyncHandler(
  async (req, res) => {
    const scheme =
      await governmentSchemeService.getSchemeById(
        req.params.id
      );

    return ApiResponse.success(
      res,
      "Government scheme fetched successfully.",
      scheme
    );
  }
);

const updateScheme = asyncHandler(
  async (req, res) => {
    const { success, data, error } =
      updateGovernmentSchemeSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: "Invalid government scheme data.",
        errors: error.flatten(),
      });
    }

    const scheme =
      await governmentSchemeService.updateScheme({
        id: req.params.id,
        data,
        staffId: req.staff._id,
      });

    return ApiResponse.success(
      res,
      "Government scheme updated successfully.",
      scheme
    );
  }
);

const deleteScheme = asyncHandler(
  async (req, res) => {
    const result =
      await governmentSchemeService.deleteScheme({
        id: req.params.id,
        staffId: req.staff._id,
      });

    return ApiResponse.success(
      res,
      "Government scheme deleted successfully.",
      result
    );
  }
);

export default {
  createScheme,
  getSchemes,
  getSchemeById,
  updateScheme,
  deleteScheme,
};