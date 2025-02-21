const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
    },
    message: {
      type: String,
      default: '',
    },
    galleryImage: {
      type: String, 
      default: null,
    },
    documentImage: {
      type: String,
      default: null,
    },
    audioUpload: {
      type: String, 
      default: null,
    },
    contact: {
      name: { type: String, default: '' }, 
      phoneNumber: { type: String, default: '' },
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.methods.markAsRead = async function () {
  this.isRead = true;
  await this.save();
};

module.exports = mongoose.model('Message', messageSchema);
