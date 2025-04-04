const mongoose = require('mongoose');
const crypto = require('crypto');

const tirthSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
       required: true
    },
    citySanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh',
       required: true
    },
    tirthType: {
        type: String,
        enum: ['दिगंबर', 'श्वेतांबर'],
        required: true
    },
    tirthShetra: {
        type: String
    },
    otherTirthShetra: {
        type: String,
        required: function() {
            return this.tirthShetra === 'अन्य';
        }
    },
    description: {
        type: String,
       // required: true
    },
    regionName:{
        type:String,
    },
    mulPratima: {
        type: String
    },
    managerName: {
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
    location: {
        country: {
            type: String,
            required: true,
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
        tehsil: {
            type: String
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
  
    facilities: {
        roomCount: Number,
        hallCount: Number,
        letBathCount: Number,
        attachLetBathCount: Number,
        acRoomCount: Number,
        nonAcRoomCount: Number,
        airCoolerCount: Number,
        guestHouseCount: Number,
        yatriCapacity: Number,
        bhojanshala: Number,
        oshdhalay: Number,
        vidhyalay: Number,
        pustkalay: Number
    },
    prabandhInputs: [{
        post: String,
        name: String,
        mobile: String
    }],
    transport: [{
        type: String,
        enum: ['रेलवे', 'बस स्टैंड']
    }],
    nearestCity: String,
    nearestTirth: String,
    regionHistory: String,
    projects: String,
    regionHistory : String,
    photos: [{
        url: String,
        caption: String
    }],
    applicationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
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
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Add indexes for common queries
tirthSchema.index({ 'location.city': 1, status: 1 });
tirthSchema.index({ citySanghId: 1, status: 1 });
tirthSchema.index({ applicationStatus: 1 });

module.exports = mongoose.model('Tirth', tirthSchema); 