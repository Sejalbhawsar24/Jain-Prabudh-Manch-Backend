const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    media: [{
        type: String,
    }],
    type: {
        type: String,
        enum: ['image', 'video', 'text'],
        required: true,
    },
    text: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: "24h"
    },
});

module.exports = mongoose.model('Story', storySchema);
