// const Comment = require('../../models/SocialMediaModels/commentModel');
// const Post = require('../../models/SocialMediaModels/postModel');
// const mongoose = require('mongoose');

// /**
//  * Create a new comment
//  * @route POST /api/comments
//  * @access Private
//  */
// exports.createComment = async (req, res) => {
//     try {
//         const { postId, userId, content } = req.body;

//         // Verify user is authenticated and matches userId
//         if (req.user.id !== userId) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Unauthorized. User ID does not match authenticated user.'
//             });
//         }

//         // Check if post exists
//         const post = await Post.findById(postId);
//         if (!post) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Post not found'
//             });
//         }

//         // Create new comment
//         const newComment = new Comment({
//             post: postId,
//             user: userId,
//             content
//         });

//         const savedComment = await newComment.save();

//         // Update post with new comment
//         await Post.findByIdAndUpdate(postId, {
//             $push: { comments: savedComment._id },
//             $inc: { commentCount: 1 }
//         });

//         res.status(201).json({
//             success: true,
//             message: 'Comment created successfully',
//             data: savedComment
//         });
//     } catch (error) {
//         console.error('Error creating comment:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error creating comment',
//             error: error.message
//         });
//     }
// };

// /**
//  * Get all comments for a specific post
//  * @route GET /api/comments/post/:postId
//  * @access Private
//  */
// exports.getCommentsByPost = async (req, res) => {
//     try {
//         const { postId } = req.params;
//         const { page = 1, limit = 10 } = req.query;
        
//         const options = {
//             page: parseInt(page, 10),
//             limit: parseInt(limit, 10),
//             sort: { createdAt: -1 },
//             populate: {
//                 path: 'user',
//                 select: 'name profilePicture'
//             }
//         };

//         // Find comments for the post with pagination
//         const comments = await Comment.find({ post: postId })
//             .populate('user', 'name profilePicture')
//             .sort({ createdAt: -1 })
//             .skip((options.page - 1) * options.limit)
//             .limit(options.limit);

//         // Get total count for pagination
//         const totalComments = await Comment.countDocuments({ post: postId });

//         res.status(200).json({
//             success: true,
//             data: comments,
//             pagination: {
//                 total: totalComments,
//                 page: options.page,
//                 limit: options.limit,
//                 pages: Math.ceil(totalComments / options.limit)
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching comments:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching comments',
//             error: error.message
//         });
//     }
// };

// /**
//  * Update a comment
//  * @route PUT /api/comments/:commentId
//  * @access Private
//  */
// exports.updateComment = async (req, res) => {
//     try {
//         const { commentId } = req.params;
//         const { content } = req.body;

//         // Find comment
//         const comment = await Comment.findById(commentId);
        
//         if (!comment) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Comment not found'
//             });
//         }

//         // Check if user is the comment owner
//         if (comment.user.toString() !== req.user.id) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Unauthorized. You can only update your own comments.'
//             });
//         }

//         // Update comment
//         comment.content = content;
//         comment.isEdited = true;
        
//         const updatedComment = await comment.save();

//         res.status(200).json({
//             success: true,
//             message: 'Comment updated successfully',
//             data: updatedComment
//         });
//     } catch (error) {
//         console.error('Error updating comment:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error updating comment',
//             error: error.message
//         });
//     }
// };

// /**
//  * Delete a comment
//  * @route DELETE /api/comments/:commentId
//  * @access Private
//  */
// exports.deleteComment = async (req, res) => {
//     try {
//         const { commentId } = req.params;
//         const session = await mongoose.startSession();
        
//         session.startTransaction();
        
//         try {
//             // Find comment
//             const comment = await Comment.findById(commentId).session(session);
            
//             if (!comment) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Comment not found'
//                 });
//             }

//             // Check if user is the comment owner
//             if (comment.user.toString() !== req.user.id) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(403).json({
//                     success: false,
//                     message: 'Unauthorized. You can only delete your own comments.'
//                 });
//             }

//             // Get post ID before deleting comment
//             const postId = comment.post;

//             // Delete comment
//             await Comment.findByIdAndDelete(commentId).session(session);

//             // Update post comment count
//             await Post.findByIdAndUpdate(postId, {
//                 $pull: { comments: commentId },
//                 $inc: { commentCount: -1 }
//             }).session(session);

//             await session.commitTransaction();
//             session.endSession();

//             res.status(200).json({
//                 success: true,
//                 message: 'Comment deleted successfully'
//             });
//         } catch (error) {
//             await session.abortTransaction();
//             session.endSession();
//             throw error;
//         }
//     } catch (error) {
//         console.error('Error deleting comment:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error deleting comment',
//             error: error.message
//         });
//     }
// };

// /**
//  * Like a comment
//  * @route POST /api/comments/:commentId/like
//  * @access Private
//  */
// exports.likeComment = async (req, res) => {
//     try {
//         const { commentId } = req.params;
//         const { userId } = req.body;

//         // Verify user is authenticated and matches userId
//         if (req.user.id !== userId) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Unauthorized. User ID does not match authenticated user.'
//             });
//         }

//         // Find comment
//         const comment = await Comment.findById(commentId);
        
//         if (!comment) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Comment not found'
//             });
//         }

//         // Check if user already liked the comment
//         if (comment.likes.includes(userId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'You have already liked this comment'
//             });
//         }

//         // Add user to likes array
//         comment.likes.push(userId);
//         await comment.save();

//         res.status(200).json({
//             success: true,
//             message: 'Comment liked successfully',
//             data: {
//                 likeCount: comment.likes.length
//             }
//         });
//     } catch (error) {
//         console.error('Error liking comment:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error liking comment',
//             error: error.message
//         });
//     }
// };

// /**
//  * Unlike a comment
//  * @route POST /api/comments/:commentId/unlike
//  * @access Private
//  */
// exports.unlikeComment = async (req, res) => {
//     try {
//         const { commentId } = req.params;
//         const { userId } = req.body;

//         // Verify user is authenticated and matches userId
//         if (req.user.id !== userId) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Unauthorized. User ID does not match authenticated user.'
//             });
//         }

//         // Find comment
//         const comment = await Comment.findById(commentId);
        
//         if (!comment) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Comment not found'
//             });
//         }

//         // Check if user has liked the comment
//         if (!comment.likes.includes(userId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'You have not liked this comment'
//             });
//         }

//         // Remove user from likes array
//         comment.likes = comment.likes.filter(id => id.toString() !== userId);
//         await comment.save();

//         res.status(200).json({
//             success: true,
//             message: 'Comment unliked successfully',
//             data: {
//                 likeCount: comment.likes.length
//             }
//         });
//     } catch (error) {
//         console.error('Error unliking comment:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error unliking comment',
//             error: error.message
//         });
//     }
// };
