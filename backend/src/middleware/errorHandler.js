export function errorHandler(error, req, res, next) {
  console.error(error);
  if (error?.name === "ZodError") {
    return res.status(422).json({ success: false, message: "Validation failed.", errors: error.issues });
  }
  if (error?.code === "P2002") {
    return res.status(409).json({ success: false, message: "A unique value already exists." });
  }
  res.status(error.status || 500).json({ success: false, message: error.message || "Internal server error." });
}
