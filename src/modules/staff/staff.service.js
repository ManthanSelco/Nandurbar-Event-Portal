import bcrypt from "bcryptjs";
import Staff from "./staff.model.js";
import ApiError from "../../shared/errors/ApiError.js";
import QueryBuilder from "../../shared/builder/QueryBuilder.js";
import { paginationMeta } from "../../shared/utils/paginationMeta.js";

/**
 * Create Staff
 */
const createStaff = async (payload, createdBy = null) => {
  let {
    name,
    email,
    mobile,
    countryCode = "+91",
    password,
  } = payload;

  name = name.trim();
  email = email.trim().toLowerCase();
  mobile = mobile.trim();

  if (!email.endsWith("@selcofoundation.org")) {
    throw new ApiError(400, "Only SELCO Foundation email is allowed.");
  }

  const existingEmail = await Staff.findOne({
    email,
    isDeleted: false,
  });

  if (existingEmail) {
    throw new ApiError(409, "Email already exists.");
  }

  const existingMobile = await Staff.findOne({
    mobile,
    isDeleted: false,
  });

  if (existingMobile) {
    throw new ApiError(409, "Mobile number already exists.");
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

  const hashedPassword = await bcrypt.hash(password, saltRounds);

 const staff = await Staff.create({
  name,
  email,
  countryCode,
  mobile,
  password: hashedPassword,
  role: "STAFF",



  // Staff created by Super Admin is trusted
  emailVerified: true,
  emailVerifiedAt: new Date(),

  createdBy,
});

const staffResponse = staff.toObject();

delete staffResponse.password;

delete staffResponse.__v;

return staffResponse;
};



/**
 * Get All Staff
 */
const getAllStaff = async (query) => {
  const queryBuilder = new QueryBuilder(
    Staff.find({
      isDeleted: false,
    }),
    query
  )
    .search(["name", "email", "mobile"])
    .filter()
    .sort()
    .paginate();

  const data = await queryBuilder.execute();

  const total = await Staff.countDocuments({
    isDeleted: false,
  });

  return {
    meta: paginationMeta(
      queryBuilder.page,
      queryBuilder.limit,
      total
    ),
    data,
  };
};

/**
 * Get Staff By ID
 */
const getStaffById = async (id) => {
  const staff = await Staff.findOne({
    _id: id,
    isDeleted: false,
  }).select("-password");

  if (!staff) {
    throw new ApiError(404, "Staff not found.");
  }

  return staff;
};

/**
 * Update Staff
 */
const updateStaff = async (id, payload, updatedBy) => {
  const staff = await Staff.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!staff) {
    throw new ApiError(404, "Staff not found.");
  }

  if (payload.email) {
    payload.email = payload.email.trim().toLowerCase();

    if (!payload.email.endsWith("@selcofoundation.org")) {
      throw new ApiError(
        400,
        "Only SELCO Foundation email is allowed."
      );
    }

    const exists = await Staff.findOne({
      email: payload.email,
      _id: { $ne: id },
      isDeleted: false,
    });

    if (exists) {
      throw new ApiError(409, "Email already exists.");
    }
  }

  if (payload.mobile) {
    const exists = await Staff.findOne({
      mobile: payload.mobile.trim(),
      _id: { $ne: id },
      isDeleted: false,
    });

    if (exists) {
      throw new ApiError(409, "Mobile already exists.");
    }

    payload.mobile = payload.mobile.trim();
  }

  payload.updatedBy = updatedBy;

  return await Staff.findByIdAndUpdate(
    id,
    payload,
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-password");
};

/**
 * Activate / Deactivate Staff
 */
const changeStatus = async (
  id,
  isActive,
  updatedBy
) => {
  const staff = await Staff.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!staff) {
    throw new ApiError(404, "Staff not found.");
  }

  staff.isActive = isActive;
  staff.updatedBy = updatedBy;

  await staff.save();

  return staff;
};

/**
 * Reset Password
 */
const resetPassword = async (
  id,
  newPassword,
  updatedBy
) => {
  const staff = await Staff.findOne({
    _id: id,
    isDeleted: false,
  }).select("+password");

  if (!staff) {
    throw new ApiError(404, "Staff not found.");
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

  staff.password = await bcrypt.hash(
    newPassword,
    saltRounds
  );

  staff.updatedBy = updatedBy;

  await staff.save();

  return true;
};

/**
 * Soft Delete Staff
 */
const deleteStaff = async (
  id,
  deletedBy
) => {
  const staff = await Staff.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!staff) {
    throw new ApiError(404, "Staff not found.");
  }

  staff.isDeleted = true;
  staff.deletedAt = new Date();
  staff.deletedBy = deletedBy;

  await staff.save();

  return true;
};

export default {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  changeStatus,
  resetPassword,
  deleteStaff,
};