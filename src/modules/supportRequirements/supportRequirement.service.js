import SupportRequirement from "./supportRequirement.model.js";
import ApiError from "../../shared/errors/ApiError.js";

const create = async (data, staffId) => {
  const existing = await SupportRequirement.findOne({
    name: data.name,
  });

  if (existing) {
    throw new ApiError(409, "Support requirement already exists.");
  }

  return SupportRequirement.create({
    ...data,
    createdBy: staffId,
    updatedBy: staffId,
  });
};

const list = async ({ activeOnly = false } = {}) => {
  const filter = activeOnly ? { isActive: true } : {};
  return SupportRequirement.find(filter)
    .sort({ name: 1 })
    .lean();
};

const getById = async (id) => {
  const item = await SupportRequirement.findById(id).lean();
  if (!item) throw new ApiError(404, "Support requirement not found.");
  return item;
};

const update = async (id, data, staffId) => {
  const item = await SupportRequirement.findByIdAndUpdate(
    id,
    { ...data, updatedBy: staffId },
    { returnDocument: "after", runValidators: true }
  ).lean();

  if (!item) throw new ApiError(404, "Support requirement not found.");
  return item;
};

const remove = async (id, staffId) => {
  const item = await SupportRequirement.findByIdAndUpdate(
    id,
    { isActive: false, updatedBy: staffId },
    { returnDocument: "after" }
  ).lean();

  if (!item) throw new ApiError(404, "Support requirement not found.");
  return item;
};

export default { create, list, getById, update, remove };
