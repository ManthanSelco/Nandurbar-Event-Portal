import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import Staff from "../staff/staff.model.js";
import ApiError from "../../shared/errors/ApiError.js";
import asyncHandler from "../../middleware/asyncHandler.js";

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Access denied. Token is missing.");
  }

  const decoded = jwt.verify(token, env.jwtSecret);

  const staff = await Staff.findById(decoded.id).select("-password");

  if (!staff) {
    throw new ApiError(401, "Staff not found.");
  }

  if (!staff.isActive) {
    throw new ApiError(403, "Staff account is inactive.");
  }

  if (staff.isDeleted) {
  throw new ApiError(
    403,
    "Staff account has been deleted."
  );
}

  req.staff = staff;

  next();
});

export default protect;