const express = require('express');
const router = express.Router();
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
    getAllVyapars
} = require('../../controller/VyaparControllers/vyaparPostController');
const { postMediaUpload } = require('../../middlewares/upload');
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const { canManageBusinessPost } = require('../../middlewares/vyaparAuthMiddleware');

// Public routes
router.get('/',getAllVyapars)
router.get('/:postId', getPostById);
router.get('/:vyaparId', getPosts);


// Protected routes - require user authentication
router.use(authMiddleware);

// Business owner routes - require business role
router.post('/:vyaparId',
    postMediaUpload,
    createPost
);

router.put('/:postId',
    canManageBusinessPost,
    postMediaUpload,
    updatePost
);

router.delete('/:postId',
    deletePost
);

// Social interaction routes
router.post('/:postId/like', toggleLike);
router.post('/:postId/comment', addComment);
router.delete('/:postId/comments/:commentId', deleteComment);

// New routes for standardized functionality
// Reply routes
router.post('/:postId/comments/:commentId/reply', addReply);
router.get('/:postId/comments/:commentId/replies', getReplies);
router.delete('/:postId/comments/:commentId/replies/:replyId', deleteReply);

// Media management route
router.delete('/media', deleteMedia);

// Hide/Unhide post route
router.put('/:postId/visibility', toggleHidePost);

module.exports = router;
