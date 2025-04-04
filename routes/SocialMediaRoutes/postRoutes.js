const express = require('express');
const { createPost, getAllPosts, likePost, unlikePost, deletePost, getPostsByUser, getPostById, addComment, addReply, toggleLike, getReplies, editPost, hidePost, unhidePost, getCombinedFeed, getCombinedFeedOptimized } = require('../../controller/SocialMediaControllers/postController');
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const rateLimit = require('express-rate-limit');

const router = express.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware);
// Rate limiting for post creation
const postCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each user to 5 posts per 15 minutes
    message: {
      success: false,
      message: 'Too many posts created. Please try again later.'
    },
    standardHeaders: true,
    keyGenerator: (req) => req.user ? req.user.id : req.ip // Use user ID if available
  });

router.post('/create', createPost, postCreationLimiter); // Create a post without authentication
router.get('/', getAllPosts);
router.get('/combined-feed', getCombinedFeed);

// Get optimized combined feed with cursor-based pagination
router.get('/combined-feed-optimized', getCombinedFeedOptimized);

router.put('/:postId/unlike', unlikePost); // Unlike a post
router.delete('/:postId', deletePost); // Delete a post
router.get('/', getPostsByUser);
router.get('/:postId',getPostById)
router.post('/comment', addComment);
router.post('/comment/reply', addReply);
router.put('/:postId/like', toggleLike);
router.put('/:postId',editPost);
router.get('/comments/:commentId/replies', getReplies);

// Visibility routes
router.put('/:postId/hide', hidePost);
  
  router.put('/:postId/unhide', unhidePost);
module.exports = router;
