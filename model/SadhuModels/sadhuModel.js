const mongoose = require('mongoose');
const crypto = require('crypto');

const sadhuSchema = new mongoose.Schema({
    // Basic Info
    // name: {
    //     type: String,
    //     required: [true, 'Name is required'],
    //     trim: true
    // },
    guruName: {
        type: String,
        required: [true, 'Guru name is required'],
        trim: true
    },
    dikshaTithi: {
        type: Date,
        required: [true, 'Diksha tithi is required']
    },
    
    // Family Background
    purvMataPita: {
        fathersName: {
            type: String,
        },
        mothersName: {
            type: String
        },
        sanyaspurvjanmplace: String,
        sanyaspurvjanmaddress: String
    },

    // Religious Info
    mulJain: {
        type: String,
    },
    panth: {
        type: String,
    },
    upjati: String,

    // Upadhi Details
    upadhiList: [{
        upadhiName: {
            type: String,
           // required: true
        },
        upadhiDate: {
            type: Date,
            //required: true
        },
        upadhiPlace: {
            type: String,
        //required: true
        }
    }],
    
    sadhuName: {
        type: String,
        required: [true, 'Sadhu name is required']
    },
    selectedMulJain: {
        type: String
    },
    selectedPanth: {
        type: String,
        default: null
    },
    selectedUpjati: {
        type: String,
        default: null
    },
    gotra: {
        type: String
    },
    fatherName: {
        type: String
    },
    fatherPlace: {
        type: String
    },
    motherName: {
        type: String
    },
    motherPlace: {
        type: String
    },
    grandfatherName: {
        type: String
    },
    grandfatherPlace: {
        type: String
    },
    greatGrandfatherName: {
        type: String
    },
    greatGrandfatherPlace: {
        type: String
    },
    brotherName: {
        type: String,
        default: ''
    },
    sisterName: {
        type: String,
        default: ''
    },
    qualification: {
        type: String,
        default: ''
    },
    mamaPaksh: {
        nanajiName: {
            type: String
        },
        mulNiwasi: {
            type: String
        },
        mamaGotra: {
            type: String
        }
    },
    dharmParivartan: {
        jati: {
            type: String,
            default: ''
        },
        upjati: {
            type: String,
            default: ''
        },
        prerda: {
            type: String,
            default: ''
        },
        sanidhya: {
            type: String,
            default: ''
        },
        samay: {
            type: String,
            default: ''
        }
    },
    contactDetails: {
        permanentAddress: {
            type: String,
            default: ''
        },
        mobileNumber: {
            type: String
        },
        whatsappNumber: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        }
    },
    uploadImage: {
        type: String,
        default: ''
    },

    // Application Status
    applicationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    
    // Review Information
    reviewInfo: {
        reviewedBy: {
            cityPresidentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            reviewDate: Date,
            comments: String
        }
    },

    // Submitted By
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // City Association
    citySanghId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HierarchicalSangh',
        required: true
    },

    // Media
    photo: String,
    documents: [String],

    // Active Status
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sadhu', sadhuSchema);
