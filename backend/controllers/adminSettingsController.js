import StoreSettings from '../models/StoreSettings.js';

/**
 * @route   GET /api/admin/settings
 * @desc    Fetch current store configuration, contacts, logistics rates, and order policies
 * @access  Private (Admin only)
 */
export const getStoreSettings = async (req, res) => {
  try {
    const settings = await StoreSettings.getSettings();

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve store settings from the server.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @route   PUT /api/admin/settings
 * @desc    Create or update the single store settings record
 * @access  Private (Admin only)
 */
export const updateStoreSettings = async (req, res) => {
  try {
    const {
      storeName,
      logoUrl,
      description,
      storeDescription,
      supportEmail,
      supportPhone,
      phoneNumber,
      shippingFee,
      freeShippingThreshold,
      cancellationPolicy,
    } = req.body;

    const validationErrors = [];

    // 1. Validate Store Name
    if (storeName !== undefined) {
      if (typeof storeName !== 'string' || storeName.trim().length < 2) {
        validationErrors.push('storeName must be at least 2 characters long.');
      }
    }

    // 2. Validate Support Email
    const targetEmail = supportEmail;
    if (targetEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof targetEmail !== 'string' || !emailRegex.test(targetEmail.trim())) {
        validationErrors.push('supportEmail must be a valid email address.');
      }
    }

    // 3. Validate Shipping Fee
    let parsedShippingFee;
    if (shippingFee !== undefined) {
      parsedShippingFee = Number(shippingFee);
      if (isNaN(parsedShippingFee) || parsedShippingFee < 0) {
        validationErrors.push('shippingFee must be a non-negative number ($0 or greater).');
      }
    }

    // 4. Validate Free Shipping Threshold
    let parsedThreshold;
    if (freeShippingThreshold !== undefined) {
      parsedThreshold = Number(freeShippingThreshold);
      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        validationErrors.push(
          'freeShippingThreshold must be a non-negative number ($0 or greater).'
        );
      }
    }

    // If both shipping values are provided, threshold cannot be lower than fee
    if (
      parsedShippingFee !== undefined &&
      parsedThreshold !== undefined &&
      parsedThreshold > 0 &&
      parsedThreshold < parsedShippingFee
    ) {
      validationErrors.push(
        'freeShippingThreshold cannot be less than standard shipping fee.'
      );
    }

    // 5. Validate Cancellation Policy
    if (cancellationPolicy !== undefined) {
      if (
        typeof cancellationPolicy !== 'string' ||
        cancellationPolicy.trim().length < 10
      ) {
        validationErrors.push(
          'cancellationPolicy must be at least 10 characters long.'
        );
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
        errors: validationErrors,
      });
    }

    // Build update object safely
    const updatePayload = {};

    if (storeName !== undefined) updatePayload.storeName = storeName.trim();
    if (logoUrl !== undefined) updatePayload.logoUrl = String(logoUrl).trim();

    // Sync description and storeDescription
    const descValue =
      description !== undefined
        ? description
        : storeDescription !== undefined
        ? storeDescription
        : undefined;
    if (descValue !== undefined) {
      updatePayload.description = String(descValue).trim();
      updatePayload.storeDescription = String(descValue).trim();
    }

    if (targetEmail !== undefined) {
      updatePayload.supportEmail = targetEmail.trim().toLowerCase();
    }

    // Sync supportPhone and phoneNumber
    const phoneValue =
      supportPhone !== undefined
        ? supportPhone
        : phoneNumber !== undefined
        ? phoneNumber
        : undefined;
    if (phoneValue !== undefined) {
      updatePayload.supportPhone = String(phoneValue).trim();
      updatePayload.phoneNumber = String(phoneValue).trim();
    }

    if (parsedShippingFee !== undefined) {
      updatePayload.shippingFee = parsedShippingFee;
    }

    if (parsedThreshold !== undefined) {
      updatePayload.freeShippingThreshold = parsedThreshold;
    }

    if (cancellationPolicy !== undefined) {
      updatePayload.cancellationPolicy = String(cancellationPolicy).trim();
    }

    // Update or create single record
    const updatedSettings = await StoreSettings.updateSettings(updatePayload);

    return res.status(200).json({
      success: true,
      message: 'Store settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Error updating store settings:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error while saving settings.',
        errors: messages,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update store settings on the server.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
