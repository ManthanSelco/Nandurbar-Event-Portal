import multer from "multer";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 20;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error(
      "Invalid file type. Only JPG, JPEG, PNG, WEBP and PDF files are allowed."
    );

    error.statusCode = 400;
    error.code = "INVALID_FILE_TYPE";

    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },

  fileFilter,
});

/*
|--------------------------------------------------------------------------
| Assessment Documents Upload
|--------------------------------------------------------------------------
|
| Frontend sends:
|
| files[]  -> one or multiple files
| docType  -> document category
|
| Supported docTypes:
|
| - sitePhotos
| - machineryPhotos
| - productPhotos
| - electricityBill
|
| Multiple files are supported for:
| - sitePhotos
| - machineryPhotos
| - productPhotos
|
| electricityBill is handled as a single document
| by the assessment controller/service.
|
|--------------------------------------------------------------------------
*/

export const uploadAssessmentDocuments = upload.array("files", MAX_FILES);

/*
|--------------------------------------------------------------------------
| Multer Error Handler
|--------------------------------------------------------------------------
|
| This middleware converts Multer errors into normal application errors
| so the global error handler can return a clean 400 response instead
| of an internal server error.
|
|--------------------------------------------------------------------------
*/

export const handleAssessmentUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      error.statusCode = 400;
      error.message = "Each file must be 10 MB or smaller.";
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      error.statusCode = 400;
      error.message = `You can upload a maximum of ${MAX_FILES} files at once.`;
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      error.statusCode = 400;
      error.message = "Unexpected file field.";
    }
  }

  next(error);
};