const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    unitType: {
      type: String,
      enum: ['विश्व इकाई', 'देश इकाई', 'राज्य इकाई', 'जिला इकाई', 'शहर इकाई'],
    },
    unitId: {
      type: String,
      unique: true,
    },
    promoterId: {
      type: String,
    },
    membersCount: {
      type: Number,
      min: 20,
    },
    president: {
      firstname: { type: String}, 
      surname: { type: String},
      kyc: String,
      photo: String, 
    },
    secretary: {
      firstname: { type: String}, 
      surname: { type: String},
      kyc: String,
      photo: String,
    },
    treasurer: {
      firstname: { type: String}, 
      surname: { type: String},
      kyc: String,
      photo: String,
    },
    otherOfficials: [
      {
        position: { type: String},
        name: { type: String },
      },
    ],
  members: [
  {
    firstname: { type: String}, 
    surname: { type: String}, 
    mobile: { type: String }, 
    email: { type: String}, 
    address: { type: String }, 
    jainAadhaar: { type: String }, 
  },
],
    paymentStatus: { 
      type: String,
      enum: ['pending', 'done'],
      default: 'pending',
    },
    status: {
     type: String,
     enum: ['pending', 'approved'],
     default: 'pending',
},

  },
  { timestamps: true }
);

// Model export
module.exports = mongoose.model('Unit', unitSchema);
