const mongoose = require('mongoose');

// Define the schema
const tirthSanrakshanSchema = new mongoose.Schema(
  {
    promotorId: {
      type: String,
    },
    tirthType: {
      type: String,
      enum: ['दिगंबर', 'श्वेतांबर'],
    },
    tirthShetra: {
      type: String, 
    },
    otherTirthShetra: {
      type: String,
      required: function() {
        return this.tirthShetra === 'अन्य';
      },
    },
    regionName: {
      type: String,
    },
    mulPratima: {
      type: String,
    },
    address: {
      type: String,
    },
    managerName: {
      type: String,
    },
    country: {
      type: String, 
    },
    state: {
      type: String, 
    },
    district: {
      type: String, 
    },
    tehsil: {
      type: String,
    },
    city: {
      type: String,
    },
    email: {
      type: String,
    },
    telephone: {
      type: String,
    },
    aawasSuvidha: {
      roomCount: {
        type: Number, 
      },
      hallCount: {
        type: Number, 
      },
      letBathCount: {
        type: Number,
      },
      attachLetBathCount: {
        type: Number, 
      },
      acRoomCount: {
        type: Number,
      },
      nonAcRoomCount: {
        type: Number,
      },
      airCoolerCount: {
        type: Number,
      },
      guestHouseCount: {
        type: Number,
      },
      yatriCapacity: {
        type: Number,
      },
      bhojanshala: {
        type: Number, 
      },
      oshdhalay: {
        type: Number, 
      },
      vidhyalay: {
        type: Number, 
      },
      pustkalay: {
        type: Number, 
      },
    },
    prabandhInputs: [
      {
        post: {
          type: String,
        },
        name: {
          type: String,
        },
        mobile: {
          type: String,
        },
      },
    ],
    transport: [
      {
        type: String,
        enum: ['रेलवे', 'बस स्टैंड'],
      },
    ],
    nearestCity: {
      type: String,
    },
    nearestTirth:{
      type:String,
    },
    regionHistory: {
      type: String,
    },
    projects:{
      type:String,
    },
    uploadImage: [
      {
        type: String, // You can store image URLs or file paths here
      },
    ],
  },
  { timestamps: true }
);

// Export the model
module.exports = mongoose.model('TirthSanrakshan', tirthSanrakshanSchema);
