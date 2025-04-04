const mongoose = require('mongoose');

const pricingConfigSchema = new mongoose.Schema({
    entityType: {
        type: String,
        enum: ['vyapar', 'biodata'],
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PricingConfig', pricingConfigSchema);
