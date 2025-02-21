const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      maxlength: 500,
    },
    image: {
      type: String,
    },
    emoji: {
    type: String, 
    default: "",
  },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        text: {
          type: String,
          maxlength: 300,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        emoji: {
          type: String,
          default: "",
        },
        replies: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
            text: {
              type: String,
              maxlength: 300,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('Post', postSchema);
