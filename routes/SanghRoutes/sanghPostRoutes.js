const express = require('express');
const router = express.Router();
const { 
  createSanghPost, 
  getSanghPosts, 
  getAllSanghPosts,
  toggleLikeSanghPost,
  commentOnSanghPost,
  deleteSanghPost,
  replyToComment,
  updateSanghPost
} = require('../../controller/SanghControllers/sanghPostController');
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const { canPostAsSangh } = require('../../middlewares/sanghPermissions');
const upload = require('../../middlewares/upload');
const { body, param } = require('express-validator');

// Protected routes
router.use(authMiddleware);

// Create post as Sangh (only office bearers)
router.post(
  '/:sanghId/posts',
  canPostAsSangh,
  upload.fields([{ name: 'media', maxCount: 10 }]),
  [
    body('content').notEmpty().withMessage('Content is required')
      .isLength({ max: 2000 }).withMessage('Content cannot exceed 2000 characters')
  ],
  createSanghPost
);

// Get Sangh posts (public)
router.get(
  '/:sanghId/posts',
  [
    param('sanghId').isMongoId().withMessage('Invalid Sangh ID')
  ],
  getSanghPosts
);

// Get all Sangh posts for social feed (public)
router.get(
  '/posts/feed',
  getAllSanghPosts
);

// Like/unlike a Sangh post
router.put(
  '/posts/:postId/like',
  [
    param('postId').isMongoId().withMessage('Invalid post ID')
  ],
  toggleLikeSanghPost
);

// Comment on a Sangh post
router.post(
  '/posts/:postId/comment',
  [
    param('postId').isMongoId().withMessage('Invalid post ID'),
    body('text').notEmpty().withMessage('Comment text is required')
      .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
  ],
  commentOnSanghPost
);
router.post("/posts/:postId/:commentId/reply", replyToComment);


// Delete a Sangh post (only creator or superadmin)
router.delete(
  '/posts/:postId',
  [
    param('postId').isMongoId().withMessage('Invalid post ID')
  ],
  deleteSanghPost
);
// Update a Sangh post
router.put(
  '/posts/:postId',
  upload.fields([{ name: 'media', maxCount: 10 }]),
  [
    param('postId').isMongoId().withMessage('Invalid post ID'),
    body('content').notEmpty().withMessage('Content is required')
      .isLength({ max: 2000 }).withMessage('Content cannot exceed 2000 characters')
  ],
  updateSanghPost
);

module.exports = router; 