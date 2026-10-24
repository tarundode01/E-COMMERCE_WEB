import multer from 'multer';
import path from 'path';

// Allowed MIME types and extensions for luxury catalog images
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Memory storage keeps file buffers in RAM, avoiding storage inside public source code
const memoryStorage = multer.memoryStorage();

// File type and extension validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

  if (isValidMime && isValidExt) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, and WebP image formats are permitted.'
      ),
      false
    );
  }
};

// 5MB max file size limit
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter,
});

/**
 * Express middleware to handle single image upload with clean error formatting
 * Supports field name 'image' or 'file'
 */
export const uploadProductImage = (req, res, next) => {
  // Support either 'image' or 'file' field name in multipart/form-data
  const multerMiddleware = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]);

  multerMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the allowed limit of 5MB. Please upload a smaller image.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Too many files provided or unexpected field name. Please provide a single image.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload validation failed.',
      });
    }

    // Attach the single file to req.file for easy controller access
    const uploadedFile = (req.files?.image && req.files.image[0]) ||
      (req.files?.file && req.files.file[0]) ||
      null;

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided. Please attach an image under field "image" or "file".',
      });
    }

    req.file = uploadedFile;
    next();
  });
};
