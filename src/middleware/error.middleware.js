const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    (err?.code === 11000 ? 409 : 500);

  const message =
    err?.code === 11000
      ? "A record with the same unique value already exists."
      : err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });
};

export default errorHandler;