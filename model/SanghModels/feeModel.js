const mongoose = require('mongoose');

const feeDistributionSchema = new mongoose.Schema({
    foundation: {
        type: Number,
        required: true,
        default: 20  // 20% to foundation
    },
    country: {
        type: Number,
        required: true,
        default: 20  // 20% to country level
    },
    state: {
        type: Number,
        required: true,
        default: 20  // 20% to state level
    },
    district: {
        type: Number,
        required: true,
        default: 20  // 20% to district level
    },
    city: {
        type: Number,
        required: true,
        default: 20  // 20% to city level
    }
});

const feePaymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sangh',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        validate: {
            validator: function(value) {
                // Will be validated against monthly fee in controller
                return value > 0;
            },
            message: 'Amount must be equal to monthly fee'
        }
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'bank_transfer', 'other'],
        required: true
    },
    transactionId: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    distribution: {
        type: feeDistributionSchema,
        required: true
    },
    distributionStatus: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    distributionDetails: [{
        level: {
            type: String,
            enum: ['foundation', 'country', 'state', 'district', 'city']
        },
        amount: Number,
        remainingAmount: Number, // Amount to be transferred to next level
        recipientSanghId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sangh'
        },
        recipientSanghName: String,
        transferredAt: Date,
        receivedAt: Date,
        confirmedBy: {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            name: String,
            role: String
        },
        status: {
            type: String,
            enum: ['pending', 'transferred', 'received', 'completed'],
            default: 'pending'
        },
        remarks: String,
        transferMethod: {
            type: String,
            enum: ['cash', 'upi', 'bank_transfer', 'other']
        },
        transferDetails: {
            transactionId: String,
            transferredBy: {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                },
                name: String,
                role: String
            },
            amount: Number // Amount transferred to next level
        }
    }],
    receipt: String,
    remarks: String,
    latePaymentCharge: {
        type: Number,
        default: 0
    }
});

const feePolicySchema = new mongoose.Schema({
    sanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sangh',
        required: true
    },
    level: {
        type: String,
        enum: ['city', 'district', 'state', 'country'],
        required: true
    },
    monthlyFee: {
        type: Number,
        required: true,
        min: 1
    },
    paymentDueDate: {
        type: Number,
        default: 10, // Due by 10th of each month
        min: 1,
        max: 28
    },
    distribution: {
        type: feeDistributionSchema,
        required: true,
        validate: {
            validator: function(value) {
                const total = Object.values(value).reduce((sum, val) => sum + val, 0);
                return total === 100;
            },
            message: 'Distribution percentages must total 100%'
        }
    },
    latePaymentCharge: {
        type: Number,
        default: 0
    },
    gracePeriod: {
        type: Number,
        default: 5,
        min: 0,
        max: 30
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const feeReminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sangh',
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    remindersSent: [{
        date: Date,
        method: {
            type: String,
            enum: ['sms', 'email', 'whatsapp', 'notification']
        },
        status: {
            type: String,
            enum: ['sent', 'failed', 'delivered', 'read']
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Indexes
feePaymentSchema.index({ userId: 1, sanghId: 1, month: 1, year: 1 }, { unique: true });
feePaymentSchema.index({ status: 1 });
feePaymentSchema.index({ paymentDate: 1 });

feePolicySchema.index({ sanghId: 1 }, { unique: true });
feePolicySchema.index({ level: 1 });

feeReminderSchema.index({ userId: 1, sanghId: 1, month: 1, year: 1 }, { unique: true });
feeReminderSchema.index({ status: 1 });
feeReminderSchema.index({ dueDate: 1 });

const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
const FeePolicy = mongoose.model('FeePolicy', feePolicySchema);
const FeeReminder = mongoose.model('FeeReminder', feeReminderSchema);

module.exports = {
    FeePayment,
    FeePolicy,
    FeeReminder
}; 