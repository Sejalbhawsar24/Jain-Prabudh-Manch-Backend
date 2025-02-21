const mongoose = require('mongoose');

const sadhuInfoSchema = new mongoose.Schema({
  cityPromoterId: {
    type: String,
  },
  sadhuName: {
    type: String,
  },
  guruName: {
    type: String,
  },
  dikshaTithi: {
    type: String,
  },
  upadhiList: [
    {
      upadhiName: {
        type: String, 
      },
      upadhiDate: {
        type: String, 
      },
      upadhiPlace: {
        type: String,
      },
    },
  ],
  purvMataPita: {
    fathersName: {
      type: String,
    },
    mothersName: {
      type: String,
    },
    sanyaspurvjanmplace: {
      type: String,
    },
    sanyaspurvjanmaddress: {
      type: String,
    },
  },
  selectedMulJain: {
    type: String,
  },
  selectedPanth: {
    type: String, 
    default: null,
  },
  selectedUpjati: {
    type: String,
    default: null,
  },
  gotra: {
    type: String, 
  },
  fatherName: {
    type: String, 
  },
  fatherPlace: {
    type: String, 
  },
  motherName: {
    type: String, 
  },
  motherPlace: {
    type: String,
  },
  grandfatherName: {
    type: String,
  },
  grandfatherPlace: {
    type: String, 
  },
  greatGrandfatherName: {
    type: String, 
  },
  greatGrandfatherPlace: {
    type: String, 
  },
  brotherName: {
    type: String,
    default: '',
  },
  sisterName: {
    type: String, 
    default: '',
  },
  qualification: {
    type: String,
    default: '',
  },
  mamaPaksh: {
    nanajiName: {
      type: String,
    },
    mulNiwasi: {
      type: String,
    },
    mamaGotra: {
      type: String,
    },
  },
  dharmParivartan: {
    jati: {
      type: String, 
      default: '',
    },
    upjati: {
      type: String, 
      default: '',
    },
    prerda: {
      type: String, 
      default: '',
    },
    sanidhya: {
      type: String,
      default: '',
    },
    samay: {
      type: String,
      default: '',
    },
  },
  contactDetails: {
    permanentAddress: {
      type: String, 
      default: '',
    },
    mobileNumber: {
      type: String, 
    },
    whatsappNumber: {
      type: String, 
      default: '',
    },
    email: {
      type: String, 
      default: '',
    },
  },
  uploadImage: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SadhuInfo', sadhuInfoSchema);
