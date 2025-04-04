const mongoose = require('mongoose');
const crypto = require('crypto');

const sanghAccessSchema = new mongoose.Schema({
    accessId: {
        type: String,
        index: true,
        sparse: true,
        unique: true
    },
    sanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh',
        required: true,
        index: true
    },
    level: {
        type: String,
        enum: ['country', 'state', 'district', 'city', 'area'],
        required: true
    },
    location: {
        country: String,
        state: String,
        district: String,
        city: String,
        area: String
    },
    parentSanghAccess: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SanghAccess'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Generate unique access ID before saving
sanghAccessSchema.pre('save', async function(next) {
    if (this.isNew && !this.accessId) {
        const prefix = {
            country: 'CNT',
            state: 'ST',
            district: 'DST',
            city: 'CTY',
            area: 'AREA'
        }[this.level];

        const timestamp = Date.now().toString().slice(-6);
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        
        this.accessId = `${prefix}-${timestamp}-${random}`;
    }
    next();
});

// Validate location based on level
sanghAccessSchema.pre('save', function(next) {
    const requiredFields = {
        area: ['country', 'state', 'district', 'city', 'area'],
        city: ['country', 'state', 'district', 'city'],
        district: ['country', 'state', 'district'],
        state: ['country', 'state'],
        country: ['country']
    };

    const required = requiredFields[this.level];
    const missing = required.filter(field => !this.location[field]);

    if (missing.length > 0) {
        next(new Error(`Missing required location fields: ${missing.join(', ')}`));
    }
    next();
});

// Add indexes
sanghAccessSchema.index({ level: 1, status: 1 });
sanghAccessSchema.index({ createdAt: -1 });

// Add method to validate hierarchy
sanghAccessSchema.methods.validateHierarchy = async function() {
    if (this.parentSanghAccess) {
        const parent = await this.model('SanghAccess').findById(this.parentSanghAccess);
        if (!parent) {
            throw new Error('Parent Sangh access not found');
        }

        const hierarchyOrder = ['country', 'state', 'district', 'city', 'area'];
        const parentIndex = hierarchyOrder.indexOf(parent.level);
        const currentIndex = hierarchyOrder.indexOf(this.level);

        if (currentIndex <= parentIndex) {
            throw new Error(`${this.level} level cannot be created under ${parent.level} level`);
        }

        // Validate location hierarchy
        switch (this.level) {
            case 'state':
                if (this.location.country !== parent.location.country) {
                    throw new Error('State must belong to parent country');
                }
                break;
            case 'district':
                if (this.location.state !== parent.location.state) {
                    throw new Error('District must belong to parent state');
                }
                break;
            case 'city':
                if (this.location.district !== parent.location.district) {
                    throw new Error('City must belong to parent district');
                }
                break;
            case 'area':
                if (this.location.city !== parent.location.city) {
                    throw new Error('Area must belong to parent city');
                }
                break;
        }
    }
    return true;
};

module.exports = mongoose.model('SanghAccess', sanghAccessSchema); 