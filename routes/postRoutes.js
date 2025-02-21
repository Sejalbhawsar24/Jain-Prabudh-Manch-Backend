const express = require('express');
const { createPost, getAllPosts, likePost, unlikePost, deletePost, getPostsByUser, getPostById, addComment, addReply, toggleLike, getReplies, editPost } = require('../controller/Postcontroller');

const router = express.Router();

// Removed authMiddleware from the create route
router.post('/create', createPost); // Create a post without authentication
router.get('/', getAllPosts); // Get all posts
router.put('/:postId/unlike', unlikePost); // Unlike a post
router.delete('/:postId', deletePost); // Delete a post
router.get('/', getPostsByUser);
router.get('/:postId',getPostById)
router.post('/comment', addComment);
router.post('/comment/reply', addReply);
router.put('/:postId/like', toggleLike);
router.put('/:postId',editPost);
router.get('/comments/:commentId/replies', getReplies);
module.exports = router;
