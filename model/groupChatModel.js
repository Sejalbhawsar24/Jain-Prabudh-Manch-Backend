const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const groupChatSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
  },
  groupImage:{
    type:String
  },
  groupMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  groupMessages: [groupMessageSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('GroupChat', groupChatSchema);
