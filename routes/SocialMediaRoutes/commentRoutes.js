// const express = require('express');
// const { 
//     createComment, 
//     getCommentsByPost, 
//     deleteComment, 
//     updateComment,
//     likeComment,
//     unlikeComment
// } = require('../../controller/SocialMediaControllers/commentController');
// const { authMiddleware } = require('../../middlewares/authMiddlewares');
// const { body, param, validationResult } = require('express-validator');
// const rateLimit = require('express-rate-limit');

// const router = express.Router();

// // Apply authentication to all routes
// router.use(authMiddleware);

// // Validation middleware
// const validateRequest = (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({
//             success: false,
//             message: 'Validation error',
//             errors: errors.array()
//         });
//     }
//     next();
// };

// // Rate limiting for comment creation to prevent spam
// const commentLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 30, // limit each user to 30 comments per 15 minutes
//     message: {
//         success: false,
//         message: 'Too many comments created. Please try again later.'
//     },
//     standardHeaders: true,
//     keyGenerator: (req) => req.user ? req.user.id : req.ip
// });

// // Comment routes
// router.post('/', 
//     commentLimiter,
//     [
//         body('postId').isMongoId().withMessage('Invalid post ID'),
//         body('userId').isMongoId().withMessage('Invalid user ID'),
//         body('content').notEmpty().withMessage('Comment content is required')
//             .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
//     ],
//     validateRequest,
//     createComment
// );

// router.get('/post/:postId', 
//     [
//         param('postId').isMongoId().withMessage('Invalid post ID')
//     ],
//     validateRequest,
//     getCommentsByPost
// );

// router.put('/:commentId', 
//     [
//         param('commentId').isMongoId().withMessage('Invalid comment ID'),
//         body('content').notEmpty().withMessage('Comment content is required')
//             .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
//     ],
//     validateRequest,
//     updateComment
// );

// router.delete('/:commentId', 
//     [
//         param('commentId').isMongoId().withMessage('Invalid comment ID')
//     ],
//     validateRequest,
//     deleteComment
// );

// // Comment like routes
// router.post('/:commentId/like', 
//     [
//         param('commentId').isMongoId().withMessage('Invalid comment ID'),
//         body('userId').isMongoId().withMessage('Invalid user ID')
//     ],
//     validateRequest,
//     likeComment
// );

// router.post('/:commentId/unlike', 
//     [
//         param('commentId').isMongoId().withMessage('Invalid comment ID'),
//         body('userId').isMongoId().withMessage('Invalid user ID')
//     ],
//     validateRequest,
//     unlikeComment
// );

// module.exports = router;
