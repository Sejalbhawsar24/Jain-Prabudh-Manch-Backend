const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  unionType: {
    type: String,
    enum: ['Country', 'State', 'District', 'City'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);
