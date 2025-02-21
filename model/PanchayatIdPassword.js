const mongoose = require('mongoose');

const panchayatIdPasswordSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
    },
    password: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PanchayatIdPassword', panchayatIdPasswordSchema);
