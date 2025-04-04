const mongoose = require('mongoose');

// Friendship Schema
const friendshipSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    followStatus: {
      type: String,
      enum: ['follow', 'following', 'unfollow','rejected'],
      default: 'follow',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Friendship', friendshipSchema);
