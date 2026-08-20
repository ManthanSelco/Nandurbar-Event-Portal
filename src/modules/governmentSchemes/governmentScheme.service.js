import GovernmentScheme from "./governmentScheme.model.js";
import ApiError from "../../shared/errors/ApiError.js";

const createScheme = async ({
  data,
  staffId,
}) => {
  const existingScheme = await GovernmentScheme.findOne({
    schemeName: data.schemeName,
    isDeleted: false,
  });

  if (existingScheme) {
    throw new ApiError(
      409,
      "A government scheme with this name already exists."
    );
  }

  const scheme = await GovernmentScheme.create({
    ...data,
    createdBy: staffId,
  });

  return scheme;
};

const getSchemes = async ({
  page = 1,
  limit = 20,
  search,
  status,
  category,
}) => {
  const filter = {
    isDeleted: false,
  };

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.$text = {
      $search: search,
    };
  }

  const skip = (page - 1) * limit;

  const [schemes, total] = await Promise.all([
    GovernmentScheme.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    GovernmentScheme.countDocuments(filter),
  ]);

  return {
    schemes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSchemeById = async (id) => {
  const scheme = await GovernmentScheme.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!scheme) {
    throw new ApiError(
      404,
      "Government scheme not found."
    );
  }

  return scheme;
};

const updateScheme = async ({
  id,
  data,
  staffId,
}) => {
  const scheme = await GovernmentScheme.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!scheme) {
    throw new ApiError(
      404,
      "Government scheme not found."
    );
  }

  if (
    data.schemeName &&
    data.schemeName !== scheme.schemeName
  ) {
    const duplicate = await GovernmentScheme.findOne({
      schemeName: data.schemeName,
      _id: { $ne: id },
      isDeleted: false,
    });

    if (duplicate) {
      throw new ApiError(
        409,
        "A government scheme with this name already exists."
      );
    }
  }

  Object.assign(scheme, data);

  scheme.updatedBy = staffId;

  await scheme.save();

  return scheme;
};

const deleteScheme = async ({
  id,
  staffId,
}) => {
  const scheme = await GovernmentScheme.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!scheme) {
    throw new ApiError(
      404,
      "Government scheme not found."
    );
  }

  scheme.isDeleted = true;
  scheme.updatedBy = staffId;

  await scheme.save();

  return {
    deleted: true,
  };
};

export default {
  createScheme,
  getSchemes,
  getSchemeById,
  updateScheme,
  deleteScheme,
};