import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary from environment variables
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName.trim(),
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
      secure: true,
    });
    return true;
  }
  return false;
};

// Check if Cloudinary credentials are validly supplied
export const isCloudinaryReady = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Dedicated secure storage directory outside public source code
const LOCAL_STORAGE_DIR = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

/**
 * Upload image buffer to Cloudinary or secure backend storage
 * @param {Object} options
 * @param {Buffer} options.buffer - Raw image file buffer from memory storage
 * @param {string} options.originalname - Original filename
 * @param {string} options.mimetype - Validated MIME type
 * @returns {Promise<{ url: string, publicId?: string, storage: 'cloudinary' | 'secure-local' }>}
 */
export const uploadImageBuffer = async ({ buffer, originalname, mimetype }) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid image file buffer is required for upload.');
  }

  // 1. If Cloudinary credentials are configured, stream directly to Cloudinary
  if (isCloudinaryReady()) {
    configureCloudinary();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'luxury-products',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            // Mask any internal credential details in error messages
            console.error('Cloudinary upload failure:', error.message);
            return reject(new Error('Cloud storage upload failed. Please verify storage configuration.'));
          }

          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            storage: 'cloudinary',
          });
        }
      );

      // Pipe memory buffer into Cloudinary upload stream
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  // 2. Secure isolated backend storage (never inside public source-code directory)
  const ext = path.extname(originalname).toLowerCase() || '.jpg';
  const uniqueName = `product_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const targetFilePath = path.join(LOCAL_STORAGE_DIR, uniqueName);

  await fs.promises.writeFile(targetFilePath, buffer);

  return {
    url: `/api/uploads/${uniqueName}`,
    filename: uniqueName,
    storage: 'secure-local',
  };
};

/**
 * Delete image from Cloudinary by public ID
 * @param {string} publicId
 */
export const deleteCloudinaryImage = async (publicId) => {
  if (!publicId || !isCloudinaryReady()) return null;
  configureCloudinary();
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to remove image from Cloudinary:', err.message);
    return null;
  }
};
