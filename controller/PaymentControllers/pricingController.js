const PricingConfig = require('../../model/PaymentModels/pricingConfigModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { DEFAULT_PRICES } = require('../../services/pricingService');

/**
 * Update price for an entity type
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updatePrice = async (req, res) => {
    try {
        const { entityType, amount } = req.body;
        
        if (!['vyapar', 'biodata'].includes(entityType)) {
            return errorResponse(res, 'Invalid entity type', 400);
        }
        
        if (!amount || amount < 0) {
            return errorResponse(res, 'Invalid amount', 400);
        }
        
        // Find and update or create new pricing config
        let pricingConfig = await PricingConfig.findOne({ entityType });
        
        if (pricingConfig) {
            pricingConfig.amount = amount;
            pricingConfig.updatedBy = req.user._id;
            pricingConfig.updatedAt = new Date();
        } else {
            pricingConfig = new PricingConfig({
                entityType,
                amount,
                updatedBy: req.user._id
            });
        }
        
        await pricingConfig.save();
        
        return successResponse(res, 'Price updated successfully', pricingConfig);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

/**
 * Get current prices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPrices = async (req, res) => {
    try {
        const pricingConfigs = await PricingConfig.find();
        
        // Create a response with all prices (including defaults for missing ones)
        const prices = {
            vyapar: DEFAULT_PRICES.vyapar,
            biodata: DEFAULT_PRICES.biodata
        };
        
        // Override with actual configured prices
        pricingConfigs.forEach(config => {
            prices[config.entityType] = config.amount;
        });
        
        return successResponse(res, 'Prices retrieved successfully', prices);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

module.exports = {
    updatePrice,
    getPrices
};
