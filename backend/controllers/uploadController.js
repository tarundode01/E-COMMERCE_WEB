import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { uploadImageBuffer } from '../services/cloudinaryService.js';

/**
 * @desc    Upload product image (Standalone or linked to productId)
 * @route   POST /api/upload
 * @access  Private/Admin
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was uploaded.',
      });
    }

    // Upload memory buffer to Cloudinary or secure backend storage
    const uploadResult = await uploadImageBuffer({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    const { productId } = req.body;
    let updatedProduct = null;

    // Optional: If productId is supplied, directly update the Product document
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID format: ${productId}`,
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found with ID: ${productId}`,
        });
      }

      product.image = uploadResult.url;
      updatedProduct = await product.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Product image uploaded successfully',
      imageUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      storage: uploadResult.storage,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Image upload controller error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image upload processing failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Upload and directly attach image to a specific product by ID
 * @route   POST /api/products/:id/image
 * @access  Private/Admin
 */
export const uploadProductImageById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was uploaded.',
      });
    }

    // Upload memory buffer to storage
    const uploadResult = await uploadImageBuffer({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    // Update product image URL in MongoDB
    product.image = uploadResult.url;
    const updatedProduct = await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product image updated successfully',
      imageUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Product image upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product image.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
