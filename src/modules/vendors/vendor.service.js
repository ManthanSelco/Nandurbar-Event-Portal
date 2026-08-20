import mongoose from "mongoose";
import Vendor from "./vendor.model.js";

const createVendor = async (data, userId) => {
  const vendor = await Vendor.create({
    ...data,
    createdBy: userId || null,
    updatedBy: userId || null,
  });

  return vendor;
};

const getVendors = async ({
  page = 1,
  limit = 20,
  search,
  geography,
  selcoEmpanelled,
  status,
}) => {
  page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 100);

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { valueChain: { $regex: search, $options: "i" } },
      {
        secondaryValueChain: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (geography) {
    filter.geography = {
      $regex: geography,
      $options: "i",
    };
  }

  if (typeof selcoEmpanelled !== "undefined") {
    filter.selcoEmpanelled =
      selcoEmpanelled === true ||
      selcoEmpanelled === "true";
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [vendors, total] = await Promise.all([
    Vendor.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Vendor.countDocuments(filter),
  ]);

  return {
    vendors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getVendorById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid vendor ID.");
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findById(id).lean();

  if (!vendor) {
    const error = new Error("Vendor not found.");
    error.statusCode = 404;
    throw error;
  }

  return vendor;
};

const updateVendor = async (id, data, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid vendor ID.");
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findByIdAndUpdate(
    id,
    {
      ...data,
      updatedBy: userId || null,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).lean();

  if (!vendor) {
    const error = new Error("Vendor not found.");
    error.statusCode = 404;
    throw error;
  }

  return vendor;
};

const deleteVendor = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid vendor ID.");
    error.statusCode = 400;
    throw error;
  }

  const vendor = await Vendor.findByIdAndDelete(id);

  if (!vendor) {
    const error = new Error("Vendor not found.");
    error.statusCode = 404;
    throw error;
  }

  return vendor;
};

const addDocument = async (id, document, userId) => {
  const vendor = await Vendor.findByIdAndUpdate(
    id,
    {
      $push: { documents: document },
      updatedBy: userId || null,
    },
    { returnDocument: "after", runValidators: true }
  );

  if (!vendor) {
    const error = new Error("Vendor not found.");
    error.statusCode = 404;
    throw error;
  }

  return vendor;
};

const addImportantLink = async (id, link, userId) => {
  const vendor = await Vendor.findByIdAndUpdate(
    id,
    {
      $push: { importantLinks: link },
      updatedBy: userId || null,
    },
    { returnDocument: "after", runValidators: true }
  );

  if (!vendor) {
    const error = new Error("Vendor not found.");
    error.statusCode = 404;
    throw error;
  }

  return vendor;
};

export default {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  addDocument,
  addImportantLink,
};