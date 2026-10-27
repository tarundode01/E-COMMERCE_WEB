import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import Category from '../models/Category.js';

/**
 * Helper to escape regex special characters
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Helper to get authenticated vendor's store
 */
async function getAuthenticatedVendorStore(req) {
  if (req.store) return req.store;
  return await Store.findOne({ vendor: req.user._id });
}

/**
 * @desc    List products for the authenticated vendor with search, filter, and pagination
 * @route   GET /api/vendor/products
 * @access  Private (Approved Vendor only)
 */
export const getVendorProducts = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    const {
      search,
      category,
      status,
      page = 1,
      limit = 10,
      sort = 'newest',
    } = req.query;

    // Strict multi-tenant isolation: Only fetch products owned by this vendor's store/account
    const andClauses = [
      {
        $or: [
          { store: store._id },
          { vendor: req.user._id },
        ],
      },
    ];

    // Search filter (name, description, SKU)
    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      andClauses.push({
        $or: [
          { name: { $regex: sanitized, $options: 'i' } },
          { description: { $regex: sanitized, $options: 'i' } },
          { sku: { $regex: sanitized, $options: 'i' } },
        ],
      });
    }

    // Category filter (supports category name, slug, or MongoDB ObjectId)
    if (category && category.trim() && category.trim().toLowerCase() !== 'all') {
      const cleanCat = category.trim();
      let matchedCategory = await Category.findOne({
        $or: [
          { name: { $regex: `^${escapeRegex(cleanCat)}$`, $options: 'i' } },
          { slug: cleanCat.toLowerCase() },
        ],
      });

      if (!matchedCategory && mongoose.Types.ObjectId.isValid(cleanCat)) {
        matchedCategory = await Category.findById(cleanCat);
      }

      if (matchedCategory) {
        andClauses.push({
          category: {
            $in: [
              new RegExp(`^${escapeRegex(matchedCategory.name)}$`, 'i'),
              cleanCat,
            ],
          },
        });
      } else {
        andClauses.push({
          category: {
            $regex: `^${escapeRegex(cleanCat)}$`,
            $options: 'i',
          },
        });
      }
    }

    // Status filter ('draft', 'published', 'archived')
    if (status && status.trim() && status.trim().toLowerCase() !== 'all') {
      andClauses.push({ status: status.trim().toLowerCase() });
    }

    // Sorting configuration
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1, createdAt: -1 };
    if (sort === 'price-desc') sortOption = { price: -1, createdAt: -1 };
    if (sort === 'stock-asc') sortOption = { stock: 1 };
    if (sort === 'stock-desc') sortOption = { stock: -1 };
    if (sort === 'name-asc') sortOption = { name: 1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { $and: andClauses };

    const total = await Product.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

    const products = await Product.find(filter)
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
      totalPages,
      limit: parsedLimit,
      hasPrevPage: parsedPage > 1,
      hasNextPage: parsedPage < totalPages,
      products,
    });
  } catch (error) {
    console.error('Error fetching vendor products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get a single product owned by the authenticated vendor
 * @route   GET /api/vendor/products/:id
 * @access  Private (Approved Vendor only)
 */
export const getVendorProductById = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Strict Cross-Vendor Ownership Check: product must belong to authenticated vendor or their store
    const isOwned =
      (product.store && product.store.toString() === store._id.toString()) ||
      (product.vendor && product.vendor.toString() === req.user._id.toString());

    if (!isOwned) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access another vendor\'s product.',
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Error fetching vendor product by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve product details.',
    });
  }
};

/**
 * @desc    Create a new product for the authenticated vendor's store
 * @route   POST /api/vendor/products
 * @access  Private (Approved Vendor only)
 */
export const createVendorProduct = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    // Verify store is active and approved
    if (store.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Action denied. Store application is currently ${store.status}. Only approved stores can create products.`,
        storeStatus: store.status,
      });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      discount,
      category,
      stock,
      image,
      images,
      sku,
      status = 'published',
    } = req.body;

    const errors = {};

    // 1. Name validation
    if (!name || !name.trim()) {
      errors.name = 'Product name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Product name must be at least 2 characters';
    } else if (name.trim().length > 150) {
      errors.name = 'Product name cannot exceed 150 characters';
    }

    // 2. Price validation
    const numPrice = Number(price);
    if (price === undefined || price === '' || isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Price must be a positive number greater than 0';
    }

    // 3. Optional original price & discount validation
    let numOriginalPrice = null;
    if (originalPrice !== undefined && originalPrice !== '' && originalPrice !== null) {
      numOriginalPrice = Number(originalPrice);
      if (isNaN(numOriginalPrice) || numOriginalPrice < 0) {
        errors.originalPrice = 'Original price cannot be negative';
      }
    }

    let numDiscount = 0;
    if (discount !== undefined && discount !== '' && discount !== null) {
      numDiscount = Number(discount);
      if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
        errors.discount = 'Discount must be between 0% and 100%';
      }
    }

    // 4. Description validation
    if (!description || !description.trim()) {
      errors.description = 'Product description is required';
    } else if (description.trim().length < 5) {
      errors.description = 'Product description must be at least 5 characters';
    }

    // 5. Stock validation
    const numStock = Number(stock !== undefined ? stock : 0);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      errors.stock = 'Stock quantity must be a non-negative integer (0 or greater)';
    }

    // 6. Category validation: Verify category exists and is active in platform taxonomy
    let matchedCategory = null;
    if (!category || !category.trim()) {
      errors.category = 'Product category is required';
    } else {
      const cleanCat = category.trim();
      matchedCategory = await Category.findOne({
        $or: [
          { name: { $regex: `^${escapeRegex(cleanCat)}$`, $options: 'i' } },
          { slug: cleanCat.toLowerCase() },
        ],
      });

      if (!matchedCategory && mongoose.Types.ObjectId.isValid(cleanCat)) {
        matchedCategory = await Category.findById(cleanCat);
      }

      if (!matchedCategory) {
        errors.category = `Selected category "${category}" does not exist in store taxonomy`;
      } else if (matchedCategory.status === 'inactive' || matchedCategory.isActive === false) {
        errors.category = `Selected category "${matchedCategory.name}" is currently inactive. New products can only be assigned to active categories.`;
      }
    }

    // 7. Image validation
    const primaryImage = (image && image.trim()) || (Array.isArray(images) && images[0]?.trim()) || '';
    if (!primaryImage) {
      errors.image = 'At least one product image URL is required';
    }

    // 8. SKU validation & Uniqueness check
    let cleanSku = '';
    if (sku && String(sku).trim()) {
      cleanSku = String(sku).trim().toUpperCase();
      const skuRegex = /^[A-Z0-9_-]{2,50}$/;
      if (!skuRegex.test(cleanSku)) {
        errors.sku = 'SKU must be 2-50 alphanumeric characters (hyphens and underscores allowed)';
      } else {
        const existingSku = await Product.findOne({ sku: cleanSku });
        if (existingSku) {
          errors.sku = `SKU "${cleanSku}" is already in use by another product. Each product must have a unique SKU.`;
        }
      }
    } else {
      // Auto-generate clean SKU
      const prefix = store.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD') || 'PRD';
      cleanSku = `${prefix}-${Date.now().toString().slice(-6)}`;
    }

    // 9. Status validation
    const cleanStatus = status ? status.toLowerCase().trim() : 'published';
    if (!['draft', 'published', 'archived'].includes(cleanStatus)) {
      errors.status = 'Status must be either draft, published, or archived';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product validation failed',
        errors,
      });
    }

    // Generate unique slug
    const cleanSlug = await Product.generateUniqueSlug(name.trim(), store._id);

    // Prepare gallery images array
    const galleryImages = Array.isArray(images) && images.length > 0 ? images.filter(Boolean) : [primaryImage];

    // Create product strictly tied to server-side store and vendor
    const product = await Product.create({
      name: name.trim(),
      slug: cleanSlug,
      sku: cleanSku,
      description: description.trim(),
      category: matchedCategory?.name || category.trim(),
      price: numPrice,
      originalPrice: numOriginalPrice,
      discount: numDiscount,
      stock: numStock,
      image: primaryImage,
      images: galleryImages,
      status: cleanStatus,
      store: store._id,
      vendor: req.user._id,
      rating: 0,
      reviewsCount: 0,
      numReviews: 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    console.error('Error creating vendor product:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `Duplicate value error on ${field}. Please use a unique value.`,
        errors: { [field]: `${field} already exists` },
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to create product.',
    });
  }
};

/**
 * @desc    Update a product owned by the authenticated vendor
 * @route   PUT /api/vendor/products/:id
 * @access  Private (Approved Vendor only)
 */
export const updateVendorProduct = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Strict Cross-Vendor Ownership Check: product must belong to authenticated vendor or their store
    const isOwned =
      (product.store && product.store.toString() === store._id.toString()) ||
      (product.vendor && product.vendor.toString() === req.user._id.toString());

    if (!isOwned) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to modify another vendor\'s product.',
      });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      discount,
      category,
      stock,
      image,
      images,
      sku,
      status,
    } = req.body;

    const errors = {};

    // 1. Name
    if (name !== undefined) {
      if (!name || !name.trim()) {
        errors.name = 'Product name cannot be empty';
      } else if (name.trim().length < 2) {
        errors.name = 'Product name must be at least 2 characters';
      } else if (name.trim() !== product.name) {
        product.name = name.trim();
        product.slug = await Product.generateUniqueSlug(product.name, store._id, product._id);
      }
    }

    // 2. Price
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.price = 'Price must be a positive number greater than 0';
      } else {
        product.price = numPrice;
      }
    }

    // 3. Original Price & Discount
    if (originalPrice !== undefined) {
      if (originalPrice === null || originalPrice === '') {
        product.originalPrice = null;
      } else {
        const numOriginalPrice = Number(originalPrice);
        if (isNaN(numOriginalPrice) || numOriginalPrice < 0) {
          errors.originalPrice = 'Original price cannot be negative';
        } else {
          product.originalPrice = numOriginalPrice;
        }
      }
    }

    if (discount !== undefined) {
      const numDiscount = Number(discount);
      if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
        errors.discount = 'Discount must be between 0% and 100%';
      } else {
        product.discount = numDiscount;
      }
    }

    // 4. Description
    if (description !== undefined) {
      if (!description || !description.trim()) {
        errors.description = 'Description cannot be empty';
      } else if (description.trim().length < 5) {
        errors.description = 'Description must be at least 5 characters';
      } else {
        product.description = description.trim();
      }
    }

    // 5. Stock
    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
        errors.stock = 'Stock quantity must be a non-negative integer';
      } else {
        product.stock = numStock;
      }
    }

    // 6. Category
    if (category !== undefined) {
      if (!category || !category.trim()) {
        errors.category = 'Category cannot be empty';
      } else {
        const cleanCat = category.trim();
        let matchedCategory = await Category.findOne({
          $or: [
            { name: { $regex: `^${escapeRegex(cleanCat)}$`, $options: 'i' } },
            { slug: cleanCat.toLowerCase() },
          ],
        });

        if (!matchedCategory && mongoose.Types.ObjectId.isValid(cleanCat)) {
          matchedCategory = await Category.findById(cleanCat);
        }

        if (!matchedCategory) {
          errors.category = `Selected category "${category}" does not exist in store taxonomy`;
        } else {
          // If category is changing to a different one, it must be active
          const isCategoryChanging = matchedCategory.name.toLowerCase() !== product.category.toLowerCase();
          if (isCategoryChanging && (matchedCategory.status === 'inactive' || matchedCategory.isActive === false)) {
            errors.category = `Selected category "${matchedCategory.name}" is currently inactive. Products cannot be reassigned to inactive categories.`;
          } else {
            product.category = matchedCategory.name;
          }
        }
      }
    }

    // 7. Images
    if (image !== undefined) {
      if (image && image.trim()) {
        product.image = image.trim();
      }
    }
    if (images !== undefined && Array.isArray(images)) {
      product.images = images.filter(Boolean);
      if (product.images.length > 0 && (!product.image || image === undefined)) {
        product.image = product.images[0];
      }
    }

    // 8. SKU
    if (sku !== undefined && String(sku).trim() !== product.sku) {
      const cleanSku = String(sku).trim().toUpperCase();
      const skuRegex = /^[A-Z0-9_-]{2,50}$/;
      if (!skuRegex.test(cleanSku)) {
        errors.sku = 'SKU must be 2-50 alphanumeric characters';
      } else {
        const existing = await Product.findOne({ sku: cleanSku, _id: { $ne: product._id } });
        if (existing) {
          errors.sku = `SKU "${cleanSku}" is already in use by another product`;
        } else {
          product.sku = cleanSku;
        }
      }
    }

    // 9. Status
    if (status !== undefined) {
      const cleanStatus = status.toLowerCase().trim();
      if (!['draft', 'published', 'archived'].includes(cleanStatus)) {
        errors.status = 'Status must be draft, published, or archived';
      } else {
        product.status = cleanStatus;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product update validation failed',
        errors,
      });
    }

    // Defense against tampering: do NOT allow modifying owner or store ID
    // (product.store and product.vendor remain untouched)

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    });
  } catch (error) {
    console.error('Error updating vendor product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product.',
    });
  }
};

/**
 * @desc    Delete a product owned by the authenticated vendor
 * @route   DELETE /api/vendor/products/:id
 * @access  Private (Approved Vendor only)
 */
export const deleteVendorProduct = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store profile found for this vendor account.',
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Strict Cross-Vendor Ownership Check: product must belong to authenticated vendor or their store
    const isOwned =
      (product.store && product.store.toString() === store._id.toString()) ||
      (product.vendor && product.vendor.toString() === req.user._id.toString());

    if (!isOwned) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to delete another vendor\'s product.',
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully from your atelier catalog.',
      id,
    });
  } catch (error) {
    console.error('Error deleting vendor product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product.',
    });
  }
};

/**
 * @desc    Quick toggle publication status of an owned product
 * @route   PATCH /api/vendor/products/:id/status
 * @access  Private (Approved Vendor only)
 */
export const updateVendorProductStatus = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format.' });
    }

    if (!status || !['draft', 'published', 'archived'].includes(status.toLowerCase().trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Status must be draft, published, or archived.',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwned =
      (product.store && product.store.toString() === store._id.toString()) ||
      (product.vendor && product.vendor.toString() === req.user._id.toString());

    if (!isOwned) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this product.',
      });
    }

    product.status = status.toLowerCase().trim();
    await product.save();

    return res.status(200).json({
      success: true,
      message: `Product publication status updated to "${product.status}".`,
      product,
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product status.' });
  }
};

/**
 * @desc    Quick update stock quantity of an owned product
 * @route   PATCH /api/vendor/products/:id/stock
 * @access  Private (Approved Vendor only)
 */
export const updateVendorProductStock = async (req, res) => {
  try {
    const store = await getAuthenticatedVendorStore(req);
    const { id } = req.params;
    const { stock } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format.' });
    }

    const numStock = Number(stock);
    if (stock === undefined || isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a non-negative integer (0 or greater).',
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const isOwned =
      (product.store && product.store.toString() === store._id.toString()) ||
      (product.vendor && product.vendor.toString() === req.user._id.toString());

    if (!isOwned) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this product.',
      });
    }

    product.stock = numStock;
    await product.save();

    return res.status(200).json({
      success: true,
      message: `Inventory stock updated to ${product.stock} units.`,
      product,
    });
  } catch (error) {
    console.error('Error updating product stock:', error);
    return res.status(500).json({ success: false, message: 'Failed to update inventory stock.' });
  }
};
