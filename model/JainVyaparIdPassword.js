const mongoose = require('mongoose');

const jainVyaparSchema = new mongoose.Schema({
  loginId: {
    type: String,
  },
  password: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true, 
});

module.exports = mongoose.model('JainVyaparIdPassword', jainVyaparSchema);
