const Post = require('../model/postModel');
const User = require('../model/userModel');
const asyncHandler = require('express-async-handler');

// Create a post
const createPost = asyncHandler(async (req, res) => {
  const { caption, image, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  const post = await Post.create({ user: userId, caption, image });
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.posts.push(post._id);
  await user.save();
  res.status(201).json(post);
});

const getPostsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  const posts = await Post.find({ user: userId })
    .populate('user', 'userName profilePicture')
    .sort({ createdAt: -1 });
  if (!posts || posts.length === 0) {
    return res.status(404).json({ error: 'No posts found for this user' });
  }
  const postData = posts.map(post => ({
    caption: post.caption,
    image: post.image,
    likes: post.likes.length,
    comments: post.comments.length,
    userName: post.user.userName,
    profilePicture: post.user.profilePicture,
    createdAt: post.createdAt
  }));
  res.json(postData);
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' });
  }
  const post = await Post.findById(postId)
    .populate('user', 'firstName lastName profilePicture') 
    .populate({
      path: 'comments.user',
      select: 'firstName lastName profilePicture',
    })
    .populate({
      path: 'comments.replies.user',
      select: 'firstName lastName profilePicture',
    });
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json({
    id: post._id,
    caption: post.caption,
    image: post.image,
    likes: post.likes.map((like) => like.toString()),
    comments: post.comments.map((comment) => ({
      id: comment._id,
      text: comment.text,
      user: {
        id: comment.user?._id,
        name: `${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim(),
        avatar: comment.user?.profilePicture,
      },
      createdAt: comment.createdAt,
      replies: comment.replies.map((reply) => ({
        id: reply._id,
        text: reply.text,
        user: {
          id: reply.user?._id,
          name: `${reply.user?.firstName || ''} ${reply.user?.lastName || ''}`.trim(),
          avatar: reply.user?.profilePicture,
        },
        createdAt: reply.createdAt,
      })),
    })),
    userId: post.user?._id,
    userName: `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim(),
    profilePicture: post.user?.profilePicture,
    createdAt: post.createdAt,
  });
  
});

// Get all posts
const getAllPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({})
    .populate('user', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 });
  const formattedPosts = posts.map(post => ({
    ...post.toObject(),
    userName: `${post.user?.firstName} ${post.user?.lastName}`,
  }));
  res.json(formattedPosts);
});


// Function to toggle like on a post
const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();
    res.status(200).json({
      message: isLiked ? 'Like removed' : 'Post liked',
      likesCount: post.likes.length,
      likes: post.likes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred', error });
  }
};
// Unlike a post
const unlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  // Check if the post is already unliked
  if (!post.likes.includes(userId)) {
    return res.status(400).json({ error: 'Post has not been liked yet' });
  }
  // Remove userId from the likes array
  post.likes = post.likes.filter((id) => id.toString() !== userId);
  await post.save();
  // Remove the post from the user's likedPosts array (update user)
  await User.findByIdAndUpdate(
    userId,
    { $pull: { likedPosts: postId } },
    { new: true }
  );
  res.json({ message: 'Post unliked', post });
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  if (post.user.toString() !== userId.toString()) {
    return res.status(403).json({ error: 'Unauthorized to delete this post' });
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.posts = user.posts.filter((id) => id.toString() !== postId.toString());
  await user.save();
  await post.deleteOne();
  res.json({ message: 'Post deleted successfully' });
});

const editPost = asyncHandler(async (req, res) => {
  const { userId, caption, image } = req.body;
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const postUserId = post.user.$oid ? post.user.$oid : post.user.toString();
    if (postUserId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    post.caption = caption;
    post.image = image;
    await post.save();
    res.status(200).json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Comment to Post
const addComment = async (req, res) => {
  try {
    const { postId, commentText, userId } = req.body;
    if (!postId || !commentText || !userId) {
      return res.status(400).json({ message: 'postId, commentText, and userId are required' });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const comment = {
      user: userId,
      text: commentText,
    };
    post.comments.push(comment);
    await post.save();
    await post.populate('comments.user', 'firstName lastName profilePicture');
    res.status(200).json({ message: 'Comment added successfully', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};
const addReply = async (req, res) => {
  const { commentId, userId, replyText } = req.body;
  try {
    const post = await Post.findOne({ 'comments._id': commentId });
    if (!post) {
      return res.status(404).json({ message: 'Post or comment not found' });
    }
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    const newReply = {
      user: userId,
      text: replyText,
      createdAt: new Date(),
    };
    comment.replies.push(newReply);
    await post.save();
    await post.populate('comments.replies.user', 'userName profilePicture');
    res.status(201).json({
      message: 'Reply added successfully',
      reply: newReply,
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Replies for a Specific Comment
const getReplies = async (req, res) => {
  const { commentId } = req.params;
  try {
    const post = await Post.findOne({ 'comments._id': commentId });
    if (!post) {
      return res.status(404).json({ message: 'Post or comment not found' });
    }
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    await post.populate('comments.replies.user', 'firstName lastName profilePicture');
      res.status(200).json({
      message: 'Replies fetched successfully',
      replies: comment.replies,
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  toggleLike,
  unlikePost,
  deletePost,
  editPost,
  getPostsByUser,
  getPostById,
  addComment,
  addReply,
  getReplies
};
