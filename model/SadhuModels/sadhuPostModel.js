const mongoose = require('mongoose');
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


const sadhuPostSchema = new mongoose.Schema({
    sadhuId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sadhu',
        required: true
    },
    caption: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'Caption cannot exceed 2000 characters']
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

// Add indexes for better performance
sadhuPostSchema.index({ sadhuId: 1, createdAt: -1 });
sadhuPostSchema.index({ isHidden: 1 });
sadhuPostSchema.index({ createdAt: -1 });

sadhuPostSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

sadhuPostSchema.virtual('commentCount').get(function() {
    return this.comments.length;
});


// Add methods for common operations
sadhuPostSchema.methods.isLikedBy = function(userId) {
    return this.likes.some(id => id.toString() === userId.toString());
};

sadhuPostSchema.methods.toggleLike = function(userId) {
    const isLiked = this.isLikedBy(userId);
    
    if (isLiked) {
        this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    } else {
        this.likes.push(userId);
    }
    
    return { isLiked: !isLiked, likeCount: this.likes.length };
};

sadhuPostSchema.methods.addComment = function(userId, text) {
    const comment = {
        user: userId,
        text,
        createdAt: new Date(),
        replies: []
    };
    
    this.comments.push(comment);
    return comment;
};

module.exports = mongoose.model('SadhuPost', sadhuPostSchema);
