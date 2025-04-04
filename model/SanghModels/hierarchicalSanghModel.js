const mongoose = require('mongoose');
const crypto = require('crypto');


const officeBearerSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['president', 'secretary', 'treasurer'],
       // required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        //required: true
    },
    firstName: {
        type: String,
        //required: true
    },
    lastName: {
        type: String,
       // required: true
    },
    jainAadharNumber: {
        type: String,
        required: true
    },
    mobileNumber:{
        type:Number
    },
    document: {
        type: String,
      //  required: true
    },
    photo: {
        type: String,
       // required: true
    },
    appointmentDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    termEndDate: {
        type: Date,
        default: () => new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)), // 2 years from appointment
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

const memberSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    jainAadharNumber: {
        type: String,
        required: true
    },
    email: String,
    phoneNumber: String,
    document: String,
    photo: String,
    address: {
        street: String,
        city: String,
        district: String,
        state: String,
        pincode: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

const hierarchicalSanghSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    level: {
        type: String,
        enum: ['country', 'state', 'district', 'city'],
       // required: true
    },
    location: {
        country: {
            type: String,
           // required: true,
            default: 'India'
        },
        state: {
            type: String,
            required: function() {
                return ['state', 'district', 'city', 'area'].includes(this.level);
            }
        },
        district: {
            type: String,
            required: function() {
                return ['district', 'city', 'area'].includes(this.level);
            }
        },
        city: {
            type: String,
            required: function() {
                return ['city', 'area'].includes(this.level);
            }
        },
        area: {
            type: String,
            required: function() {
                return this.level === 'area';
            }
        }
    },
    parentSangh: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh'
    },
    sanghAccessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SanghAccess',
        default: null
    },
    officeBearers: [officeBearerSchema],
    membersCount:{
        type:String
    },
    members: [memberSchema],
    establishedDate: {
        type: Date,
        default: Date.now
    },
    description: String,
    contact: {
        email: String,
        phone: String,
        address: String
    },
    socialMedia: {
        facebook: String,
        twitter: String,
        instagram: String,
        website: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sanghType: {
        type: String,
        enum: ['main', 'women', 'youth'],
        default: 'main',
        required: true
    },
    parentMainSangh: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh',
        default: null
    }
}, {
    timestamps: true
});


// Generate unique access ID before saving
hierarchicalSanghSchema.pre('save', async function(next) {
    if (this.isNew && !this.accessId) {
        const prefix = {
            country: 'CNT',
            state: 'ST',
            district: 'DST',
            city: 'CTY',
            area: 'AREA'
        }[this.level] || 'SNG';
        
        const timestamp = Date.now().toString().slice(-6);
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        
        this.accessId = `${prefix}-${timestamp}-${random}`;
    }
    // If sanghAccessId is undefined, set it to null explicitly
    if (this.sanghAccessId === undefined) {
        this.sanghAccessId = null;
    }
    next();
});

// Add validation methods and middleware here
hierarchicalSanghSchema.methods.validateHierarchy = async function() {
    if (this.level === 'country') {
        if (this.parentSangh) {
            throw new Error('Country level Sangh cannot have a parent Sangh');
        }
        return;
    }

    // if (!this.parentSangh) {
    //     throw new Error('Non-country level Sangh must have a parent Sangh');
    // }

    const parentSangh = await this.constructor.findById(this.parentSangh);
    if (!parentSangh) {
        throw new Error('Parent Sangh not found');
    }

    const levelHierarchy = ['country', 'state', 'district', 'city', 'area'];
    const parentIndex = levelHierarchy.indexOf(parentSangh.level);
    const currentIndex = levelHierarchy.indexOf(this.level);

    if (currentIndex <= parentIndex || currentIndex - parentIndex > 1) {
        throw new Error(`Invalid hierarchy: ${this.level} level cannot be directly under ${parentSangh.level} level`);
    }
};

// Add pre-save middleware to ensure validation
hierarchicalSanghSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            await this.validateHierarchy();
        } catch (error) {
            next(error);
            return;
        }
    }
    next();
});

hierarchicalSanghSchema.methods.getHierarchy = async function() {
    const hierarchy = {
        current: this.toObject(),
        parent: null,
        children: []
    };

    if (this.parentSangh) {
        hierarchy.parent = await this.model('HierarchicalSangh')
            .findById(this.parentSangh)
            .select('name level location');
    }

    hierarchy.children = await this.model('HierarchicalSangh')
        .find({ parentSangh: this._id, status: 'active' })
        .select('name level location');

    return hierarchy;
};

hierarchicalSanghSchema.methods.getChildSanghs = async function() {
    return await this.model('HierarchicalSangh')
        .find({ parentSangh: this._id, status: 'active' })
        .populate('officeBearers.userId', 'name email phoneNumber')
        .select('-members');
};

// Add indexes
hierarchicalSanghSchema.index({ level: 1, status: 1 });
hierarchicalSanghSchema.index({ parentSangh: 1 }); // status index is already covered above
hierarchicalSanghSchema.index({ createdAt: -1 });
// Use a sparse index for sanghAccessId to allow multiple null values
hierarchicalSanghSchema.index({ sanghAccessId: 1 }, { sparse: true });

module.exports = mongoose.model('HierarchicalSangh', hierarchicalSanghSchema); 