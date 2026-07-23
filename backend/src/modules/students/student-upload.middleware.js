import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "students");

fs.mkdirSync(uploadDirectory, {
  recursive: true
});

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, uploadDirectory);
  },

  filename(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

    callback(null, uniqueName);
  }
});

function validateImage(_req, file, callback) {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);

  if (!allowedTypes.has(file.mimetype)) {
    callback(
      new Error("Only JPG, PNG and WEBP student photos are allowed.")
    );
    return;
  }

  callback(null, true);
}

export const uploadStudentPhoto = multer({
  storage,
  fileFilter: validateImage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single("photo");
