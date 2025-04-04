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

const jainVyaparPostSchema = new mongoose.Schema({
    vyaparId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JainVyapar',
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

// Index for efficient queries
jainVyaparPostSchema.index({ vyaparId: 1, createdAt: -1 });
jainVyaparPostSchema.index({ isHidden: 1 });
jainVyaparPostSchema.index({ createdAt: -1 });

// Add virtuals for counts
jainVyaparPostSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

jainVyaparPostSchema.virtual('commentCount').get(function() {
    return this.comments.length;
});

// Add methods for common operations
jainVyaparPostSchema.methods.isLikedBy = function(userId) {
    return this.likes.some(id => id.toString() === userId.toString());
};

jainVyaparPostSchema.methods.toggleLike = function(userId) {
    const isLiked = this.isLikedBy(userId);
    
    if (isLiked) {
        this.likes = this.likes.filter(id => id.toString() !== userId.toString());
    } else {
        this.likes.push(userId);
    }
    
    return { isLiked: !isLiked, likeCount: this.likes.length };
};

jainVyaparPostSchema.methods.addComment = function(userId, text) {
    const comment = {
        user: userId,
        text,
        createdAt: new Date(),
        replies: []
    };
    
    this.comments.push(comment);
    return comment;
};

const JainVyaparPost = mongoose.model('JainVyaparPost', jainVyaparPostSchema);
module.exports = JainVyaparPost;
