const mongoose = require('mongoose');
const crypto = require('crypto');

const jainVyaparSchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: true,
    },
    businessType: {
        type: String,
        required: true,
    },
    productCategory: [{
        type: String,
        required: true
    }],
    description: {
        type: String,
        required: true
    },
    location: {
        country: {
            type: String,
            // required: true,
            default: 'India'
        },
        state: {
            type: String,
            // required: true
        },
        district: {
            type: String,
            // required: true
        },
        city: {
            type: String,
            // required: true
        },
        address: {
            type: String,
            // required: true
        }
    },
    // citySanghId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'HierarchicalSangh',
    //     required: true
    // },
    owner: {
        name: {
            type: String,
            // required: true
        },
        email: String,
        phone: String,
        jainAadharNumber: {
            type: String,
            // required: true
        }
    },
    photos: [{
        url: String,
        caption: String
    }],
    documents: [{
        url: String,
        type: String,
        name: String
    }],
    applicationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    reviewNotes: {
        text: String,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date
    },
    status: {
        type: String,
        enum: ['inactive', 'active'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Add indexes for common queries
jainVyaparSchema.index({ 'location.city': 1, status: 1 });
jainVyaparSchema.index({ citySanghId: 1, status: 1 });
jainVyaparSchema.index({ applicationStatus: 1 });

module.exports = mongoose.model('JainVyapar', jainVyaparSchema);
