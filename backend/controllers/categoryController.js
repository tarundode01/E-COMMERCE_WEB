import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import CategoryRequest from '../models/CategoryRequest.js';
import Store from '../models/Store.js';

// Escape regex special characters to prevent regex injection
const escapeRegex = (string) => {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * @desc    Fetch categories with optional status filter, search, and pagination
 * @route   GET /api/categories
 * @access  Public (Defaults to active categories for customers; supports ?status=all for admin)
 */
export const getCategories = async (req, res) => {
  try {
    const { status, search, page, limit, sort = 'name' } = req.query;

    const filter = {};

    // 1. Status Filter:
    // If status === 'all', include both active and inactive (for admin management)
    // If status === 'inactive', return only inactive categories
    // Default (public/customer): Return only active categories
    if (status === 'all') {
      // No status filter applied
    } else if (status === 'inactive') {
      filter.$or = [{ status: 'inactive' }, { isActive: false }];
    } else {
      // Default: Active only. Exclude explicitly inactive categories
      filter.status = { $ne: 'inactive' };
      filter.isActive = { $ne: false };
    }

    // 2. Search query filter (matches name or description)
    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { slug: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // 3. Sorting
    let sortOptions = { name: 1 };
    if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'name-desc') {
      sortOptions = { name: -1 };
    }

    // 4. Pagination (Optional: if limit or page is supplied)
    const isPaginationRequested = Boolean(page || limit);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit === 'all' ? 1000 : Math.max(1, parseInt(limit, 10) || 50);
    const skip = (parsedPage - 1) * parsedLimit;

    const totalCategories = await Category.countDocuments(filter);

    let query = Category.find(filter).sort(sortOptions);
    if (isPaginationRequested && limit !== 'all') {
      query = query.skip(skip).limit(parsedLimit);
    }

    const categories = await query;

    // Attach product counts for each category
    const categoryNames = categories.map((c) => c.name);
    const productCountAggregation = await Product.aggregate([
      { $match: { category: { $in: categoryNames } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    productCountAggregation.forEach((item) => {
      countMap[item._id] = item.count;
    });

    const categoriesWithCounts = categories.map((cat) => {
      const catObj = cat.toJSON();
      catObj.productCount = countMap[cat.name] || 0;
      return catObj;
    });

    const totalPages = isPaginationRequested ? Math.ceil(totalCategories / parsedLimit) || 1 : 1;

    return res.status(200).json({
      success: true,
      count: categoriesWithCounts.length,
      totalCategories,
      totalPages,
      page: parsedPage,
      limit: parsedLimit,
      categories: categoriesWithCounts,
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
 * @desc    Fetch single category by ID or unique slug with associated product count
 * @route   GET /api/categories/:id
 * @access  Public
 */
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    let category = null;

    // Check if ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    }

    // If not found by ObjectId, attempt lookup by unique slug or exact name
    if (!category) {
      category = await Category.findOne({
        $or: [
          { slug: id.toLowerCase().trim() },
          { name: { $regex: `^${escapeRegex(id.trim())}$`, $options: 'i' } },
        ],
      });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with identifier: ${id}`,
      });
    }

    // Count products currently assigned to this category
    const productCount = await Product.countDocuments({ category: category.name });

    const catObj = category.toJSON();
    catObj.productCount = productCount;

    return res.status(200).json({
      success: true,
      category: catObj,
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
    const { name, slug, description, image, status = 'active' } = req.body;

    // 1. Name validation
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

    // 2. Duplicate category name check (case-insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category "${trimmedName}" already exists. Category name must be unique.`,
        errors: { name: 'Category name already exists' },
      });
    }

    // 3. Slug preparation
    let finalSlug = slug ? slug.trim().toLowerCase() : '';
    if (finalSlug) {
      finalSlug = finalSlug
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if custom slug already taken
      const existingSlug = await Category.findOne({ slug: finalSlug });
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: `Category slug "${finalSlug}" is already in use. Please provide a unique slug.`,
          errors: { slug: 'Category slug already in use' },
        });
      }
    } else {
      finalSlug = await Category.generateUniqueSlug(trimmedName);
    }

    // 4. Status validation
    const cleanStatus = status === 'inactive' ? 'inactive' : 'active';
    const isActive = cleanStatus === 'active';

    const category = await Category.create({
      name: trimmedName,
      slug: finalSlug,
      description: description ? description.trim() : '',
      image: image ? image.trim() : '',
      status: cleanStatus,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: category.toJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name or slug already exists. Both must be unique.',
        errors: { name: 'Duplicate category field' },
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

    const { name, slug, description, image, status, isActive } = req.body;
    const oldName = category.name;

    // 1. Update name if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Category name must be at least 2 characters',
          errors: { name: 'Invalid category name' },
        });
      }

      // Check if another category already has this name
      const duplicate = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Category "${trimmedName}" already exists. Category name must be unique.`,
          errors: { name: 'Category name already exists' },
        });
      }

      category.name = trimmedName;

      // Update products referencing the old category name to maintain referential integrity
      if (oldName !== trimmedName) {
        await Product.updateMany({ category: oldName }, { category: trimmedName });
      }
    }

    // 2. Update slug if provided or re-generate if name changed and no slug given
    if (slug !== undefined && slug.trim()) {
      let customSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const duplicateSlug = await Category.findOne({
        _id: { $ne: id },
        slug: customSlug,
      });

      if (duplicateSlug) {
        return res.status(400).json({
          success: false,
          message: `Slug "${customSlug}" is already in use by another category.`,
          errors: { slug: 'Category slug already in use' },
        });
      }

      category.slug = customSlug;
    } else if (name !== undefined && (!category.slug || oldName !== category.name)) {
      category.slug = await Category.generateUniqueSlug(category.name, category._id);
    }

    // 3. Update description & image
    if (description !== undefined) {
      category.description = description.trim();
    }
    if (image !== undefined) {
      category.image = image.trim();
    }

    // 4. Update status & isActive
    if (status !== undefined) {
      const cleanStatus = status === 'inactive' ? 'inactive' : 'active';
      category.status = cleanStatus;
      category.isActive = cleanStatus === 'active';
    } else if (isActive !== undefined) {
      const activeBool = Boolean(isActive);
      category.isActive = activeBool;
      category.status = activeBool ? 'active' : 'inactive';
    }

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory.toJSON(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name or slug already exists. Category name must be unique.',
        errors: { name: 'Duplicate category field' },
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
 * @desc    Toggle category status (Activate / Deactivate)
 * @route   PATCH /api/categories/:id/status
 * @access  Private/Admin
 */
export const updateCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isActive } = req.body;

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

    let targetStatus = '';
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either "active" or "inactive"',
        });
      }
      targetStatus = status;
    } else if (isActive !== undefined) {
      targetStatus = Boolean(isActive) ? 'active' : 'inactive';
    } else {
      // Toggle current status
      targetStatus = category.status === 'active' ? 'inactive' : 'active';
    }

    category.status = targetStatus;
    category.isActive = targetStatus === 'active';

    await category.save();

    // Check count of assigned products for informational feedback
    const productCount = await Product.countDocuments({ category: category.name });

    return res.status(200).json({
      success: true,
      message: `Category "${category.name}" is now ${targetStatus}.`,
      category: category.toJSON(),
      productCount,
    });
  } catch (error) {
    console.error(`Error toggling category status for ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update category status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete a category safely (Blocked if products are assigned)
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

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

    // Safety check: Prevent deletion if products are assigned to this category
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
      message: `Category "${category.name}" deleted successfully.`,
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

/**
 * @desc    Submit a new category proposal from an authenticated vendor
 * @route   POST /api/categories/request
 * @access  Private (Vendor only)
 */
export const submitCategoryRequest = async (req, res) => {
  try {
    const { name, reason } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Proposed category name is required.',
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Proposed category name must be at least 2 characters.',
      });
    }

    // Check if category already exists in active or inactive platform taxonomy
    const existingCategory = await Category.findOne({
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category "${trimmedName}" already exists on the platform.`,
      });
    }

    // Find vendor's store
    const store = await Store.findOne({ vendor: req.user._id });

    // Create category request
    const request = await CategoryRequest.create({
      name: trimmedName,
      reason: reason ? reason.trim() : '',
      vendor: req.user._id,
      store: store ? store._id : null,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Category proposal submitted successfully to platform curators.',
      request,
    });
  } catch (error) {
    console.error('Error submitting category request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit category proposal.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get category proposals for the authenticated vendor (or all if admin)
 * @route   GET /api/categories/requests
 * @access  Private (Vendor / Admin)
 */
export const getCategoryRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.vendor = req.user._id;
    }

    const requests = await CategoryRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('vendor', 'name email')
      .populate('store', 'name slug');

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error retrieving category requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve category proposals.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete or withdraw a pending category proposal
 * @route   DELETE /api/categories/request/:id
 * @access  Private (Vendor / Admin)
 */
export const deleteCategoryRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await CategoryRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Category proposal not found.',
      });
    }

    // Vendor can only delete their own proposals
    if (req.user.role !== 'admin' && request.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this category proposal.',
      });
    }

    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Category proposal withdrawn successfully.',
      id,
    });
  } catch (error) {
    console.error('Error deleting category request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to withdraw category proposal.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

