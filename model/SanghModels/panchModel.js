const mongoose = require('mongoose');

// Create a schema for individual Panch member details
const panchMemberSchema = new mongoose.Schema({
    personalDetails: {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true
        },
        surname: {
            type: String,
            required: [true, 'Surname is required'],
            trim: true
        },
        mobileNumber: {
            type: String,
            required: [true, 'Mobile number is required'],
            validate: {
                validator: function(v) {
                    return /\d{10}/.test(v);
                },
                message: 'Please enter a valid 10-digit mobile number'
            }
        },
        jainAadharNumber: {
            type: String,
            required: [true, 'Jain Aadhar number is required']
        },
        professionalBio: {
            type: String,
            required: [true, 'Professional introduction is required'],
            maxLength: [500, 'Professional bio cannot exceed 500 characters']
        }
    },
    documents: {
        jainAadharPhoto: {
            type: String,  // S3 URL
          //  required: [true, 'Jain Aadhar photo is required']
        },
        profilePhoto: {
            type: String,  // S3 URL
           // required: [true, 'Profile photo is required']
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

const panchSchema = new mongoose.Schema({
    sanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh',
        required: [true, 'Sangh ID is required'],
    },
    panchName:{
        type:String
    },
    members: {
        type: [panchMemberSchema],
        validate: {
            validator: function(members) {
                return members.filter(m => m.status === 'active').length === 5;
            },
           // message: 'Panch must have exactly 5 active members'
        }
    },
    term: {
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date,
            default: () => new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)) // 2 years default
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Add indexes
// panchSchema.index({ sanghId: 1, status: 1 });
// panchSchema.index({ 'members.personalDetails.jainAadharNumber': 1 });

module.exports = mongoose.model('Panch', panchSchema); 