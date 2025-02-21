// models/ShanghatanIdPassword.js
const mongoose = require('mongoose');

const ShanghatanIdPasswordSchema = new mongoose.Schema({
  userName: {
    type: String,
  },
  password: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('ShanghatanIdPassword', ShanghatanIdPasswordSchema);
