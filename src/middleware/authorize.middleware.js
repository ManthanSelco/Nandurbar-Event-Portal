import ApiError from "../shared/errors/ApiError.js";

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.staff) {
      return next(
        new ApiError(
          401,
          "Authentication required."
        )
      );
    }

    if (!roles.includes(req.staff.role)) {
      return next(
        new ApiError(
          403,
          "You are not authorized to perform this action."
        )
      );
    }

    next();
  };
};

export default authorize;