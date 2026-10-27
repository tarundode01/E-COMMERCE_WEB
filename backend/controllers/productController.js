import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

/**
 * Helper to escape special regex characters safely
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * @desc    Fetch all products with advanced filtering, sorting & server-driven pagination
 * @route   GET /api/products
 * @access  Public
 */
export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      rating,
      sort,
      page,
      limit,
      inStock,
    } = req.query;

    const filter = {
      // Exclude draft/unpublished products from public catalog
      status: { $ne: 'draft' },
    };

    // Exclude products belonging to unapproved, inactive, or hidden stores
    const { default: Store } = await import('../models/Store.js');
    const inactiveStores = await Store.find({
      $or: [
        { status: { $ne: 'approved' } },
        { isPubliclyVisible: false },
      ],
    }).select('_id');
    const inactiveStoreIds = inactiveStores.map((s) => s._id);
    if (inactiveStoreIds.length > 0) {
      filter.store = { $nin: inactiveStoreIds };
    }

    // 1. Search filter: Matches product name or description (case-insensitive)
    if (search && typeof search === 'string' && search.trim()) {
      const sanitizedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    // 2. Category filter: Case-insensitive match on name or slug, ignore 'All'
    if (
      category &&
      typeof category === 'string' &&
      category.trim() &&
      category.trim().toLowerCase() !== 'all'
    ) {
      const cleanCat = category.trim();
      const matchedCategory = await Category.findOne({
        $or: [
          { name: { $regex: `^${escapeRegex(cleanCat)}$`, $options: 'i' } },
          { slug: cleanCat.toLowerCase() },
        ],
      });

      if (matchedCategory) {
        filter.category = {
          $regex: `^${escapeRegex(matchedCategory.name)}$`,
          $options: 'i',
        };
      } else {
        filter.category = {
          $regex: `^${escapeRegex(cleanCat)}$`,
          $options: 'i',
        };
      }
    }

    // 3. Price range filters: minPrice & maxPrice
    if (minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice))) {
      const min = Math.max(0, Number(minPrice));
      filter.price = { ...filter.price, $gte: min };
    }

    if (maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice))) {
      const max = Math.max(0, Number(maxPrice));
      filter.price = { ...filter.price, $lte: max };
    }

    // 4. Rating filter: Minimum rating threshold
    if (rating !== undefined && rating !== '' && !isNaN(Number(rating))) {
      const r = Number(rating);
      if (r > 0) {
        filter.rating = { $gte: Math.min(5, Math.max(0, r)) };
      }
    }

    // 5. In-stock filter
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      filter.stock = 0;
    }

    // 6. Sorting configuration
    let sortOption = { createdAt: -1 }; // Default: Newest first

    if (sort === 'price-asc') {
      sortOption = { price: 1, createdAt: -1 };
    } else if (sort === 'price-desc') {
      sortOption = { price: -1, createdAt: -1 };
    } else if (sort === 'rating') {
      sortOption = { rating: -1, numReviews: -1, createdAt: -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'name-asc') {
      sortOption = { name: 1 };
    } else if (sort === 'name-desc') {
      sortOption = { name: -1 };
    }

    // 7. Server-driven pagination calculations
    const isFetchAll = limit === 'all';
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = isFetchAll
      ? 1000
      : Math.min(100, Math.max(1, parseInt(limit, 10) || (page ? 9 : 50)));

    const skip = isFetchAll ? 0 : (parsedPage - 1) * parsedLimit;

    // Count matching documents before pagination
    const total = await Product.countDocuments(filter);
    const totalPages = isFetchAll ? 1 : Math.max(1, Math.ceil(total / parsedLimit));

    // Execute query with filter, sort, skip, limit, and populate store
    const products = await Product.find(filter)
      .populate('store', 'name slug status isPubliclyVisible')
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalProducts: total,
      page: parsedPage,
      currentPage: parsedPage,
      limit: parsedLimit,
      pageSize: parsedLimit,
      totalPages,
      hasPrevPage: parsedPage > 1,
      hasNextPage: parsedPage < totalPages,
      products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Fetch single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    const product = await Product.findById(id).populate('store', 'name slug status isPubliclyVisible');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with ID: ${id}`,
      });
    }

    // Customer Catalog Protection: Do not display draft products or products from unapproved stores
    if (product.status === 'draft') {
      return res.status(404).json({
        success: false,
        message: 'This product is currently in draft mode and not published.',
      });
    }

    if (product.store && (product.store.status !== 'approved' || product.store.isPubliclyVisible === false)) {
      return res.status(404).json({
        success: false,
        message: 'This product belongs to an atelier that is currently not active on the marketplace.',
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(`Error fetching product ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve product details.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      price,
      originalPrice,
      description,
      stock,
      image,
    } = req.body;

    // Validate required fields presence
    const missingFields = [];
    if (!name || !name.trim()) missingFields.push('name');
    if (!category || !category.trim()) missingFields.push('category');
    if (price === undefined || price === null || price === '') missingFields.push('price');
    if (!description || !description.trim()) missingFields.push('description');
    if (stock === undefined || stock === null || stock === '') missingFields.push('stock');
    if (!image || !image.trim()) missingFields.push('image');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        errors: missingFields.reduce((acc, field) => {
          acc[field] = `${field} is required`;
          return acc;
        }, {}),
      });
    }

    // Validate price
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid number greater than 0',
        errors: { price: 'Price must be greater than 0' },
      });
    }

    // Validate stock
    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be an integer of 0 or greater',
        errors: { stock: 'Stock must be a non-negative integer' },
      });
    }

    // Validate originalPrice if provided
    let numOriginalPrice = null;
    if (
      originalPrice !== undefined &&
      originalPrice !== null &&
      originalPrice !== ''
    ) {
      numOriginalPrice = Number(originalPrice);
      if (isNaN(numOriginalPrice) || numOriginalPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Original price must be a valid number greater than or equal to 0',
          errors: { originalPrice: 'Original price cannot be negative' },
        });
      }
    }

    // Create product
    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      price: numPrice,
      originalPrice: numOriginalPrice,
      description: description.trim(),
      stock: numStock,
      image: image.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update an existing product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
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

    const {
      name,
      category,
      price,
      originalPrice,
      description,
      stock,
      image,
    } = req.body;

    // Validate updated fields if provided
    if (name !== undefined) {
      if (!name.trim() || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Product name must be at least 2 characters',
          errors: { name: 'Invalid product name' },
        });
      }
      product.name = name.trim();
    }

    if (category !== undefined) {
      if (!category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be empty',
          errors: { category: 'Invalid category' },
        });
      }
      product.category = category.trim();
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid number greater than 0',
          errors: { price: 'Price must be greater than 0' },
        });
      }
      product.price = numPrice;
    }

    if (originalPrice !== undefined) {
      if (originalPrice === null || originalPrice === '') {
        product.originalPrice = null;
      } else {
        const numOriginalPrice = Number(originalPrice);
        if (isNaN(numOriginalPrice) || numOriginalPrice < 0) {
          return res.status(400).json({
            success: false,
            message: 'Original price cannot be negative',
            errors: { originalPrice: 'Original price cannot be negative' },
          });
        }
        product.originalPrice = numOriginalPrice;
      }
    }

    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
        return res.status(400).json({
          success: false,
          message: 'Stock must be an integer of 0 or greater',
          errors: { stock: 'Stock must be a non-negative integer' },
        });
      }
      product.stock = numStock;
    }

    if (description !== undefined) {
      if (!description.trim() || description.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Description must be at least 5 characters',
          errors: { description: 'Description is too short' },
        });
      }
      product.description = description.trim();
    }

    if (image !== undefined) {
      if (!image.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Image URL or path cannot be empty',
          errors: { image: 'Image is required' },
        });
      }
      product.image = image.trim();
    }

    const updatedProduct = await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
        errors: error.errors,
      });
    }

    console.error(`Error updating product ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
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

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      id,
    });
  } catch (error) {
    console.error(`Error deleting product ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
