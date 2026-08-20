import vendorService from "./vendor.service.js";
import vendorImport from "./vendor.import.js";
import {
  createVendorSchema,
  updateVendorSchema,
} from "./vendor.validation.js";

const createVendor = async (req, res, next) => {
  try {
    const { error, value } =
      createVendorSchema.validate(req.body, {
        abortEarly: false,
      });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details
          .map((item) => item.message)
          .join(", "),
      });
    }

    const vendor = await vendorService.createVendor(
      value,
      req.user?._id
    );

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

const getVendors = async (req, res, next) => {
  try {
    const result = await vendorService.getVendors(
      req.query
    );

    return res.status(200).json({
      success: true,
      message: "Vendors fetched successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const vendor =
      await vendorService.getVendorById(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message: "Vendor fetched successfully.",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

const updateVendor = async (req, res, next) => {
  try {
    const { error, value } =
      updateVendorSchema.validate(req.body, {
        abortEarly: false,
      });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details
          .map((item) => item.message)
          .join(", "),
      });
    }

    const vendor =
      await vendorService.updateVendor(
        req.params.id,
        value,
        req.user?._id
      );

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully.",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    await vendorService.deleteVendor(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

const addDocument = async (req, res, next) => {
  try {
    const vendor =
      await vendorService.addDocument(
        req.params.id,
        req.body,
        req.user?._id
      );

    return res.status(200).json({
      success: true,
      message: "Vendor document added successfully.",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

const importCsv = async (req, res, next) => {
  try {
    const result = await vendorImport.importCsv(
      req.file?.buffer,
      req.staff?._id
    );

    return res.status(200).json({
      success: true,
      message: "Vendor CSV import completed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const addImportantLink = async (req, res, next) => {
  try {
    const vendor =
      await vendorService.addImportantLink(
        req.params.id,
        req.body,
        req.user?._id
      );

    return res.status(200).json({
      success: true,
      message: "Vendor important link added successfully.",
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  addDocument,
  addImportantLink,
  importCsv,
};