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
    media: [{
      url: {
        type: String,
        //required: true
      },
      type: {
        type: String,
        enum: ['image', 'video'],
      },
      thumbnail: {
        type: String
      }
    }],
    postType: { type: String, enum: ['text', 'media'], default: 'text' },
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
        isHidden: {
          type: Boolean,
          default: false
        },
        community: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Community',
          sparse: true
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
// Indexes - grouped for better readability
postSchema.index({ createdAt: -1 });
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ 'comments.createdAt': -1 });
// Add compound indexes for common query patterns
postSchema.index({ user: 1, createdAt: -1 }); // For user profile posts
postSchema.index({ isHidden: 1, createdAt: -1 }); // For filtering hidden posts
postSchema.index({ user: 1, isHidden: 1 }); // For quickly finding a user's visible posts

// Add text index for search functionality
postSchema.index({ caption: 'text' }); // Enables text search on captions

// Virtuals
postSchema.virtual('likeCount').get(function () {
  return this.likes.length;
});

postSchema.virtual('commentCount').get(function () {
  return this.comments.length;
});

// Methods
postSchema.methods.isLikedBy = function (userId) {
  return this.likes.some(id => id.toString() === userId.toString());
};

postSchema.methods.toggleLike = function (userId) {
  const isLiked = this.isLikedBy(userId);

  if (isLiked) {
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  } else {
    this.likes.push(userId);
  }

  return { isLiked: !isLiked, likeCount: this.likes.length };
};

postSchema.methods.addComment = function (userId, text) {
  const comment = {
    user: userId,
    text,
    createdAt: new Date()
  };

  this.comments.push(comment);
  return comment;
};

postSchema.methods.findComment = function (commentId) {
  return this.comments.id(commentId);
};

const Post = mongoose.model('Post', postSchema);
module.exports = mongoose.model('Post', postSchema);
