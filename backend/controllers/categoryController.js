import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

/**
 * @desc    Fetch all categories
 * @route   GET /api/categories
 * @access  Public
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch single category by ID with associated product count
 * @route   GET /api/categories/:id
 * @access  Public
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: `Category not found with ID: ${id}`,
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with ID: ${id}`,
      });
    }

    // Get count of products currently assigned to this category
    const productCount = await Product.countDocuments({ category: category.name });

    return res.status(200).json({
      success: true,
      category,
      productCount,
    });
  } catch (error) {
    console.error(`Error fetching category ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve category details.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    // Validate name presence
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
        errors: { name: 'Category name cannot be empty' },
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be at least 2 characters',
        errors: { name: 'Category name is too short' },
      });
    }

    // Check for duplicate category name (case-insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category "${trimmedName}" already exists. Category name must be unique.`,
        errors: { name: 'Category name already exists' },
      });
    }

    const category = await Category.create({
      name: trimmedName,
      description: description ? description.trim() : '',
      image: image ? image.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    // Handle Mongoose duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists. Category name must be unique.',
        errors: { name: 'Duplicate category name' },
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error('Error creating category:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create category. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update an existing category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: `Category not found with ID: ${id}`,
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with ID: ${id}`,
      });
    }

    const { name, description, image } = req.body;
    const oldName = category.name;

    // Validate updated name if supplied
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Category name must be at least 2 characters',
          errors: { name: 'Invalid category name' },
        });
      }

      // Check if another category already has this name (case-insensitive)
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Category "${trimmedName}" already exists. Category name must be unique.`,
          errors: { name: 'Category name already exists' },
        });
      }

      category.name = trimmedName;

      // If category name has changed, update products that reference the old category name
      if (oldName !== trimmedName) {
        await Product.updateMany({ category: oldName }, { category: trimmedName });
      }
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      category.image = image.trim();
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists. Category name must be unique.',
        errors: { name: 'Duplicate category name' },
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error(`Error updating category ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: `Category not found with ID: ${id}`,
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with ID: ${id}`,
      });
    }

    // Safety check: Prevent accidental deletion if products are assigned to this category
    const assignedProductCount = await Product.countDocuments({
      category: category.name,
    });

    if (assignedProductCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}" because ${assignedProductCount} product(s) are currently assigned to it. Please reassign or remove those products before deleting this category.`,
        assignedProductCount,
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
      id,
    });
  } catch (error) {
    console.error(`Error deleting category ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete category.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
