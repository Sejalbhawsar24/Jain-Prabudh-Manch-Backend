const mongoose = require('mongoose');

const jainAdharLoginSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('JainAdharLogin', jainAdharLoginSchema);
