import StoreSettings from '../models/StoreSettings.js';

/**
 * Safe default fallback shipping parameters
 * Used when store settings record is temporarily unavailable or uninitialized
 */
export const DEFAULT_SHIPPING_FEE = 25;
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 500;

/**
 * Fetch and validate active shipping parameters from StoreSettings model
 * Safely guards against missing, non-numeric, or corrupted settings records
 * @returns {Promise<{ shippingFee: number, freeShippingThreshold: number }>}
 */
export const getActiveShippingSettings = async () => {
  try {
    const settings = await StoreSettings.getSettings();

    let shippingFee = Number(settings?.shippingFee);
    if (isNaN(shippingFee) || shippingFee < 0) {
      shippingFee = DEFAULT_SHIPPING_FEE;
    }

    let freeShippingThreshold = Number(settings?.freeShippingThreshold);
    if (isNaN(freeShippingThreshold) || freeShippingThreshold < 0) {
      freeShippingThreshold = DEFAULT_FREE_SHIPPING_THRESHOLD;
    }

    return {
      shippingFee: Math.round(shippingFee * 100) / 100,
      freeShippingThreshold: Math.round(freeShippingThreshold * 100) / 100,
    };
  } catch (error) {
    console.error(
      'Failed to load store shipping settings from database, using safe defaults:',
      error.message
    );
    return {
      shippingFee: DEFAULT_SHIPPING_FEE,
      freeShippingThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
    };
  }
};

/**
 * Calculate verified shipping charges based on verified order subtotal
 * @param {number} subtotal - Verified order subtotal from database product prices
 * @param {object} [customSettings] - Optional pre-loaded { shippingFee, freeShippingThreshold }
 * @returns {Promise<{ subtotal: number, shippingFee: number, freeShippingThreshold: number, isFreeShipping: boolean, amountToFreeShipping: number }>}
 */
export const calculateShipping = async (subtotal, customSettings = null) => {
  const numericSubtotal = Number(subtotal);

  if (isNaN(numericSubtotal) || numericSubtotal < 0) {
    throw new Error(
      'Verified order subtotal must be a valid non-negative number.'
    );
  }

  // Retrieve active store settings unless custom settings were provided
  const { shippingFee: baseFee, freeShippingThreshold: threshold } =
    customSettings || (await getActiveShippingSettings());

  // Free shipping unlocks when verified subtotal meets or exceeds threshold
  const qualifiesForFreeShipping =
    threshold > 0 && numericSubtotal >= threshold;

  const appliedShippingFee = qualifiesForFreeShipping ? 0 : baseFee;
  const amountToFreeShipping =
    threshold > 0 && !qualifiesForFreeShipping
      ? Math.max(0, Math.round((threshold - numericSubtotal) * 100) / 100)
      : 0;

  return {
    subtotal: Math.round(numericSubtotal * 100) / 100,
    shippingFee: Math.round(appliedShippingFee * 100) / 100,
    freeShippingThreshold: Math.round(threshold * 100) / 100,
    isFreeShipping: qualifiesForFreeShipping,
    amountToFreeShipping,
  };
};

/**
 * Calculate complete, trusted order financial breakdown
 * Never trusts client-submitted totals; calculates everything server-side
 * @param {number} verifiedSubtotal - Sum of (trusted product price * quantity)
 * @param {object} [customSettings] - Optional settings override
 * @returns {Promise<{ subtotal: number, itemsPrice: number, shippingFee: number, shippingPrice: number, taxPrice: number, totalAmount: number, isFreeShipping: boolean, freeShippingThreshold: number, amountToFreeShipping: number }>}
 */
export const calculateOrderTotals = async (
  verifiedSubtotal,
  customSettings = null
) => {
  const shippingResult = await calculateShipping(
    verifiedSubtotal,
    customSettings
  );

  // Standard estimated luxury tax (8%)
  const taxPrice = Math.round(shippingResult.subtotal * 0.08 * 100) / 100;

  // Final Total = Subtotal + Shipping Fee + Tax
  const totalAmount =
    Math.round(
      (shippingResult.subtotal + shippingResult.shippingFee + taxPrice) * 100
    ) / 100;

  return {
    subtotal: shippingResult.subtotal,
    itemsPrice: shippingResult.subtotal,
    shippingFee: shippingResult.shippingFee,
    shippingPrice: shippingResult.shippingFee,
    taxPrice,
    totalAmount,
    isFreeShipping: shippingResult.isFreeShipping,
    freeShippingThreshold: shippingResult.freeShippingThreshold,
    amountToFreeShipping: shippingResult.amountToFreeShipping,
  };
};
