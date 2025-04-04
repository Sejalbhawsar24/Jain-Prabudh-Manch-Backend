const mongoose = require('mongoose');

// Create a reusable reply schema
const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Create a reusable comment schema
const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  replies: [replySchema]
}, { _id: true });

const tirthPostSchema = new mongoose.Schema({
    tirthId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tirth',
        required: true
    },
    caption: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'Caption cannot exceed 2000 characters']
    },
    media: [{
        type: {
            type: String,
            enum: ['image', 'video'],
            required: true
        },
        url: {
            type: String,
            required: true
        }
    }],
    postedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [commentSchema],
    isHidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add indexes for common queries
tirthPostSchema.index({ tirthId: 1, createdAt: -1 });
tirthPostSchema.index({ isHidden: 1 });
tirthPostSchema.index({ createdAt: -1 });

// Add virtuals for counts
tirthPostSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

tirthPostSchema.virtual('commentCount').get(function() {
    return this.comments.length;
});

// Add methods for common operations
tirthPostSchema.methods.isLikedBy = function(userId) {
    return this.likes.some(id => id.toString() === userId.toString());
};

tirthPostSchema.methods.toggleLike = function(userId) {
    const isLiked = this.isLikedBy(userId);
    
    if (isLiked) {
        this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    } else {
        this.likes.push(userId);
    }
    
    return { isLiked: !isLiked, likeCount: this.likes.length };
};

tirthPostSchema.methods.addComment = function(userId, text) {
    const comment = {
        user: userId,
        text,
        createdAt: new Date(),
        replies: []
    };
    
    this.comments.push(comment);
    return comment;
};

module.exports = mongoose.model('TirthPost', tirthPostSchema);