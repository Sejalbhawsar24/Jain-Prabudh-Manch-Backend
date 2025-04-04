const mongoose = require('mongoose');

const panchPostSchema = new mongoose.Schema({
  panchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panch',
    required: true
  },
  sanghId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HierarchicalSangh',
    required: true
  },
  postedByMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  postedByName: {
    type: String,
    required: true
  },
  postedProfilePicture: {
    type: String,
  },
  caption: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Content cannot exceed 2000 characters']
  },
  media: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    }
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
 comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      replyText: {
        type: String,
        required: true,
        maxlength: [500, 'Reply cannot exceed 500 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],

  isHidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// panchPostSchema.index({ panchId: 1, createdAt: -1 });
// panchPostSchema.index({ sanghId: 1, createdAt: -1 });
// panchPostSchema.index({ postedByMemberId: 1 });
// panchPostSchema.index({ createdAt: -1 });
// panchPostSchema.index({ isHidden: 1 });

// Virtuals
panchPostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

panchPostSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Methods
panchPostSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(id => id.toString() === userId.toString());
};

panchPostSchema.methods.toggleLike = function(userId) {
  const isLiked = this.isLikedBy(userId);

  if (isLiked) {
    this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  } else {
    this.likes.push(userId);
  }

  return { isLiked: !isLiked, likeCount: this.likes.length };
};

panchPostSchema.methods.addComment = function(userId, text) {
  const comment = {
    user: userId,
    text,
    createdAt: new Date()
  };

  this.comments.push(comment);
  return comment;
};

module.exports = mongoose.model('PanchPost', panchPostSchema); 