const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    paymentId: {
        type: String,
        sparse: true // Allow null/undefined values but enforce uniqueness when present
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed'],
        default: 'created'
    },
    entityType: {
        type: String,
        enum: ['vyapar', 'sangh', 'panch', 'tirth', 'sadhu', 'biodata'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        sparse: true // Allow null/undefined for payments not yet associated with an entity
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    formData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    receipt: String,
    notes: mongoose.Schema.Types.Mixed,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field on save
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add indexes for common queries
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
