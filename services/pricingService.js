const PricingConfig = require('../model/PaymentModels/pricingConfigModel');

// Default prices (fallback if no config exists)
const DEFAULT_PRICES = {
    vyapar: 599 * 100, // ₹999 in paise
    biodata: 249 * 100  // ₹499 in paise
};

/**
 * Get current price for an entity type
 * @param {string} entityType - The type of entity (vyapar, biodata)
 * @returns {Promise<number>} - The price in paise
 */
const getPrice = async (entityType) => {
    try {
        const pricingConfig = await PricingConfig.findOne({ entityType });
        
        if (pricingConfig) {
            return pricingConfig.amount;
        }
        
        // If no config exists, use default price
        return DEFAULT_PRICES[entityType] || 0;
    } catch (error) {
        console.error(`Error fetching price for ${entityType}:`, error);
        // Fallback to default price on error
        return DEFAULT_PRICES[entityType] || 0;
    }
};

module.exports = {
    getPrice,
    DEFAULT_PRICES
};
