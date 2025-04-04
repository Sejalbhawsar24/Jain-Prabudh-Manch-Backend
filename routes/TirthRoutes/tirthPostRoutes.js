const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const { canManageTirthPost } = require('../../middlewares/tirthAuthMiddleware');
const { postMediaUpload } = require('../../middlewares/upload');
const {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    deleteComment,
    addReply,
    getReplies,
    deleteReply,
    deleteMedia,
    toggleHidePost,
    getAllTirthPosts
} = require('../../controller/TirthControllers/tirthPostController');

// Public routes
router.get('/', getAllTirthPosts);
router.get('/:tirthId/posts', getPosts);
router.get('/:postId', getPostById);

// Protected routes - require user authentication
router.use(authMiddleware);

// Post management routes
router.post('/:tirthId/posts', canManageTirthPost, postMediaUpload, createPost);
router.put('/:postId', canManageTirthPost, postMediaUpload, updatePost);
router.delete('/:postId', deletePost);

// Interaction routes
router.post('/:postId/like', toggleLike);
router.post('/:postId/comment', addComment);
router.delete('/:postId/comments/:commentId', deleteComment);

// New routes for comment replies
router.post('/:postId/comments/:commentId/reply', addReply);
router.get('/:postId/comments/:commentId/replies', getReplies);
router.delete('/:postId/comments/:commentId/replies/:replyId', deleteReply);

// Media management route
router.delete('/media', deleteMedia);

// Post visibility route
router.put('/:postId/visibility', toggleHidePost);

module.exports = router;