const mongoose = require('mongoose');

const panchSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobileNumber: { type: String,  },
  jainAadhar: { type: String, },
  shortIntroduction: { type: String }, 
  kycDocument: { type: String },
  photo: { type: String },
  
});

const panchayatSchema = new mongoose.Schema(
  {
    userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
    unitType: { type: String},
    unitId: {
        type: String,
      },
    promoterId: { type: String, required: true },
    panch1: { type: panchSchema },
    panch2: { type: panchSchema },
    panch3: { type: panchSchema},
    panch4: { type: panchSchema },
    panch5: { type: panchSchema },
    paymentStatus: { 
        type: String,
        enum: ['pending', 'done'],
        default: 'pending',
      },
      status: {
       type: String,
       enum: ['pending', 'approved'],
       default: 'pending',
      }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Panchayat', panchayatSchema);
