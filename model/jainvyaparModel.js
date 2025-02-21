const mongoose = require('mongoose');

const JainVyaparSchema = new mongoose.Schema(
  {
    promotorId: {
      type: String,
    },
    vyaparType: {
      type: String,
    },
    productCategory: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true, 
  }
);

const JainVyapar = mongoose.model('JainVyapar', JainVyaparSchema);

module.exports = JainVyapar;
