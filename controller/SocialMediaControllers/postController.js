const Post = require('../../model/SocialMediaModels/postModel');
const User = require('../../model/UserRegistrationModels/userModel');
const asyncHandler = require('express-async-handler');
const upload = require('../../middlewares/upload');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { body, validationResult, param, query } = require('express-validator');
const Notification = require('../../model/SocialMediaModels/notificationModel')
const { getIo } = require('../../websocket/socket')
const SanghPost = require('../../model/SanghModels/sanghPostModel');
const PanchPost = require('../../model/SanghModels/panchPostModel');
const VyaparPost = require('../../model/VyaparModels/vyaparPostModel');
const TirthPost = require('../../model/TirthModels/tirthPostModel');
const SadhuPost = require('../../model/SadhuModels/sadhuPostModel');
//const { getOrSetCache, invalidateCache, invalidatePattern } = require('../../utils/cache');

// Create a post
// const createPost = asyncHandler(async (req, res) => {
//   const { caption, image, userId } = req.body;
//   if (!userId) {
//     return res.status(400).json({ error: 'User ID is required' });
//   }
//   const post = await Post.create({ user: userId, caption, image });
//   const user = await User.findById(userId);
//   if (!user) {
//     return res.status(404).json({ error: 'User not found' });
//   }
//   user.posts.push(post._id);
//   await user.save();
//   res.status(201).json(post);
// });

const createPost = [
  upload.postMediaUpload,
  body('caption').optional().isString().isLength({ max: 500 }).withMessage('Caption must be a string with a maximum length of 500 characters'),
  body('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { caption, userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const media = [];
    if (req.files) {
      if (req.files.image) {
        req.files.image.forEach(file => {
          media.push({
            url: file.location,
            type: 'image'
          });
        });
      }
      if (req.files.video) {
        req.files.video.forEach(file => {
          media.push({
            url: file.location,
            type: 'video'
          });
        });
      }
    }
    const post = await Post.create({ user: userId, caption, media });
    user.posts.push(post._id);
    await user.save();
    res.status(201).json(post);
  })
];
const getPostsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  const posts = await Post.find({ user: userId })
    .populate('user', 'firstName lastName profilePicture')
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
  const userId = req.user.id; // Logged-in user ID

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required' });
  }

  // filter hata diya aur postId se direct search kar rahe hain
  const post = await Post.findOne({ _id: postId })
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
    image: post.media?.[0]?.url,
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

// // Get all posts
// const getAllPosts = asyncHandler(async (req, res) => {
//     const userId = req.user.id;
//     const user = await User.findById(userId);

//     if (!user) {
//         return res.status(404).json({ error: 'User not found' });
//     }

//     let filter = {};

//     // ✅ Restrict posts if Jain Aadhar is not verified
//     if (user.jainAadharStatus === 'none' || user.jainAadharStatus === 'pending') {
//         if (!user.trialPeriodStart) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Trial period not started. Please verify your Jain Aadhar."
//             });
//         }

//         // Trial period ke 2 din tak hi posts dikhane ka logic
//         const trialEnd = new Date(user.trialPeriodStart);
//         trialEnd.setDate(trialEnd.getDate() + 2); // Trial start ke 2 din baad tak

//         const currentDate = new Date();

//         if (currentDate > trialEnd) {
//             return res.status(403).json({
//                 success: false,
//                 message: "Trial period expired. Please verify your Jain Aadhar to access all posts."
//             });
//         }

//         // Sirf trial period ke dauraan bani posts hi show hongi
//         filter.createdAt = { $gte: user.trialPeriodStart, $lt: trialEnd };
//     }

//     // ✅ Agar Jain Aadhar verified hai to sari posts dikhao (koi filter nahi lagega)
//     const posts = await Post.find(filter)
//         .populate('user', 'firstName lastName profilePicture')
//         .sort({ createdAt: -1 });

//     const formattedPosts = posts.map(post => ({
//         ...post.toObject(),
//         userName: `${post.user?.firstName} ${post.user?.lastName}`,
//     }));

//     res.json(formattedPosts);
// });

// Get all posts
const getAllPosts = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
      return res.status(404).json({ error: 'User not found' });
  }

  // filter hata diya, saare posts fetch karne ke liye empty object `{}` use kiya
  const posts = await Post.find({})
      .populate('user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 });

  const formattedPosts = posts.map(post => ({
      ...post.toObject(),
      userName: `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim(),
  }));

  res.json(formattedPosts);
});

// Function to toggle like on a post
const toggleLike = [
  asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    // 🔹 User ka naam fetch karein
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const post = await Post.findById(postId).populate('user');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(userId);
    if (isLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
      // Notification delete karein
      await Notification.findOneAndDelete({
        senderId: userId,
        receiverId: post.user._id,
        type: 'like',
      });
    } else {
      // Like add karein
      post.likes.push(userId);
      // Notification create aur save karein
      const notification = new Notification({
        senderId: userId,
        receiverId: post.user._id, // Fix: user ka _id lena zaroori hai
        type: 'like',
       message:`${user.firstName} ${user.lastName} liked your post.`,
      });
      await notification.save();

      // Socket notification send karein
      const io = getIo();
      io.to(post.user._id.toString()).emit('newNotification', notification);
    }

    await post.save();
    res.status(200).json({
      message: isLiked ? 'Like removed' : 'Post liked',
      likesCount: post.likes.length,
      likes: post.likes,
    });
  }),
];

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
  // Delete media files from S3 bucket
  if (post.media && post.media.length > 0) {
    const deletePromises = post.media.map(async (mediaItem) => {
      try {
        const key = extractS3KeyFromUrl(mediaItem.url);
        if (key) {
          const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
          };
          
          await s3Client.send(new DeleteObjectCommand(deleteParams));
          console.log(`Successfully deleted file from S3: ${key}`);
        }
      } catch (error) {
        console.error(`Error deleting file from S3: ${mediaItem.url}`, error);
        // Continue with post deletion even if S3 deletion fails
      }
    });
    
    // Wait for all S3 delete operations to complete
    await Promise.all(deletePromises);
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
     // If replaceMedia flag is set, delete existing media from S3 and replace with new ones
     if (req.body.replaceMedia === 'true' && post.media && post.media.length > 0) {
      // Delete existing media from S3
      const deletePromises = post.media.map(async (mediaItem) => {
        try {
          const key = extractS3KeyFromUrl(mediaItem.url);
          if (key) {
            const deleteParams = {
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key
            };
            
            await s3Client.send(new DeleteObjectCommand(deleteParams));
            console.log(`Successfully deleted file from S3: ${key}`);
          }
        } catch (error) {
          console.error(`Error deleting file from S3: ${mediaItem.url}`, error);
        }
      });
      await Promise.all(deletePromises);
      
      // Clear existing media array
      post.media = [];
    }
    if (req.files) {
      if (req.files.image) {
        req.files.image.forEach(file => {
          post.media.push({
            url: file.location,
            type: 'image'
          });
        });
      }
      if (req.files.video) {
        req.files.video.forEach(file => {
          post.media.push({
            url: file.location,
            type: 'video'
          });
        });
      }
    }
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
    const user = await User.findById(userId);
    if(!user){
      return res.status(404).json({ message: 'User not found'})
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
    // Send a comment notification
    const notification = new Notification({
      senderId: userId,
      receiverId: post.user,
      type: 'comment',
     message: `${user.firstName} ${user.lastName} commented on your post.`,
    });
    await notification.save();
    // Emit the notification event to the receiver
    const io = getIo();
    io.to(post.user.toString()).emit('newNotification', notification);
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
    const user = await User.findById(userId);
    if(!user){
      return res.status(404).json({ message: 'User not found'})
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
    await post.populate('comments.replies.user', 'firstName lastName profilePicture');
     // Send a reply notification
     const notification = new Notification({
      senderId: userId,
      receiverId: comment.user,
      type: 'reply',
      message: `${user.firstName} ${user.lastName} replied to your comment.`
    });
    await notification.save();
    // Emit the notification event to the receiver
    const io = getIo();
    io.to(comment.user.toString()).emit('newNotification', notification);
 
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
// Delete a specific media item from a post
const deleteMediaItem = asyncHandler(async (req, res) => {
  const { postId, mediaId } = req.params;
  const { userId } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    return errorResponse(res, 'Post not found', 404);
  }

  if (post.user.toString() !== userId) {
    return errorResponse(res, 'Unauthorized to modify this post', 403);
  }

  // Find the media item in the post
  const mediaItem = post.media.id(mediaId);
  if (!mediaItem) {
    return errorResponse(res, 'Media item not found', 404);
  }

  // Delete from S3
  try {
    const key = extractS3KeyFromUrl(mediaItem.url);
    if (key) {
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      };
      
      await s3Client.send(new DeleteObjectCommand(deleteParams));
      console.log(`Successfully deleted file from S3: ${key}`);
    }
  } catch (error) {
    console.error(`Error deleting file from S3: ${mediaItem.url}`, error);
    return errorResponse(res, 'Error deleting media from storage', 500);
  }

  // Remove the media item from the post
  post.media.pull(mediaId);
  await post.save();

  return successResponse(res, post, 'Media item deleted successfully');
});

// Hide a post (make it invisible to others)
const hidePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    return errorResponse(res, 'Post not found', 404);
  }

  if (post.user.toString() !== userId) {
    return errorResponse(res, 'Unauthorized to modify this post', 403);
  }

  post.isHidden = true;
  await post.save();

  return successResponse(res, post, 'Post hidden successfully');
});

// Unhide a post (make it visible again)
const unhidePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  const post = await Post.findById(postId);
  if (!post) {
    return errorResponse(res, 'Post not found', 404);
  }

  if (post.user.toString() !== userId) {
    return errorResponse(res, 'Unauthorized to modify this post', 403);
  }

  post.isHidden = false;
  await post.save();

  return successResponse(res, post, 'Post unhidden successfully');
});

// Get combined feed of user posts and Sangh posts
const getCombinedFeed = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log("Fetching combined feed...");

    // 🛠 Check Total User Posts Before Querying
    const totalUserPosts = await Post.countDocuments();
    console.log("Total User Posts in DB:", totalUserPosts);
    // Import all required post models
    const SanghPost = require('../../model/SanghModels/sanghPostModel');
    const PanchPost = require('../../model/SanghModels/panchPostModel');
    const VyaparPost = require('../../model/VyaparModels/vyaparPostModel');
    const TirthPost = require('../../model/TirthModels/tirthPostModel');
    const SadhuPost = require('../../model/SadhuModels/sadhuPostModel');
    
    // Get all posts from different models with Promise.all for parallel execution
    const [userPosts, sanghPosts, panchPosts, vyaparPosts, tirthPosts, sadhuPosts] = await Promise.all([
      // Regular user posts
      Post.find()
        .populate('user', 'firstName lastName profilePicture')
        .sort('-createdAt')
        .select('caption media user likes comments createdAt')
        .lean(),
      
      // Sangh posts
      SanghPost.find({ isHidden: false })
        .populate('sanghId', 'name level location')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media sanghId postedByUserId postedByRole likes comments createdAt')
        .lean(),
      
      // Panch posts
      PanchPost.find({ isHidden: false })
        .populate('panchId', 'accessId')
        .populate('sanghId', 'name level location')
        .sort('-createdAt')
        .select('caption media panchId sanghId postedByMemberId postedByName likes comments createdAt')
        .lean(),
        
      // Vyapar posts
      VyaparPost.find({ isHidden: false })
        .populate('vyaparId', 'name businessType')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media vyaparId postedByUserId likes comments createdAt')
        .lean(),
        
      // Tirth posts
      TirthPost.find({ isHidden: false })
        .populate('tirthId', 'name location')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media tirthId postedByUserId likes comments createdAt')
        .lean(),
        
      // Sadhu posts
      SadhuPost.find({ isHidden: false })
        .populate('sadhuId', 'sadhuName uploadImage')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media sadhuId postedByUserId likes comments createdAt')
        .lean()
    ]);
    console.log("Fetched User Posts:", userPosts.length);
    console.log("Fetched Sangh Posts:", sanghPosts.length);
    console.log("Fetched Panch Posts:", panchPosts.length);
    console.log("Fetched Vyapar Posts:", vyaparPosts.length);
    console.log("Fetched Tirth Posts:", tirthPosts.length);
    console.log("Fetched Sadhu Posts:", sadhuPosts.length);

    // Add post type for frontend differentiation
    const postsWithTypes = [
      ...userPosts.map(post => ({ ...post, postType: 'user' })),
      ...sanghPosts.map(post => ({ ...post, postType: 'sangh' })),
      ...panchPosts.map(post => ({ ...post, postType: 'panch' })),
      ...vyaparPosts.map(post => ({ ...post, postType: 'vyapar' })),
      ...tirthPosts.map(post => ({ ...post, postType: 'tirth' })),
      ...sadhuPosts.map(post => ({ ...post, postType: 'sadhu' }))
    ];
    
    // Sort all posts by creation date
    const sortedPosts = postsWithTypes.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Apply pagination after combining all posts
    const paginatedPosts = sortedPosts.slice(skip, skip + limit);
    
    // Get total count for pagination
    const totalPosts = sortedPosts.length;
    
    console.log("Total Combined Posts:", totalPosts);
    return successResponse(res, {
      posts: paginatedPosts,
      pagination: {
        total: totalPosts,
        page,
        pages: Math.ceil(totalPosts / limit)
      }
    }, 'Combined feed retrieved successfully');
  } catch (error) {
    console.error('Error in getCombinedFeed:', error);
    return errorResponse(res, 'Error retrieving combined feed', 500, error.message);
  }
});

// Optimized version of combined feed with cursor-based pagination
const getCombinedFeedOptimized = asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor; // timestamp of the oldest post in the previous batch
  
    
    // Build query based on cursor
    const cursorQuery = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
    
    // Get posts from each model with the cursor filter
    const [userPosts, sanghPosts, panchPosts, vyaparPosts, tirthPosts, sadhuPosts] = await Promise.all([
      // Regular user posts
      Post.find({ ...cursorQuery, isHidden: false })
        .populate('user', 'firstName lastName profilePicture')
        .sort('-createdAt')
        .select('caption media user likes comments createdAt')
        .limit(limit)
        .lean(),
      
      // Sangh posts
      SanghPost.find({ ...cursorQuery, isHidden: false })
        .populate('sanghId', 'name level location')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media sanghId postedByUserId postedByRole likes comments createdAt')
        .limit(limit)
        .lean(),
      
      // Panch posts
      PanchPost.find({ ...cursorQuery, isHidden: false })
        .populate('panchId', 'accessId')
        .populate('sanghId', 'name level location')
        .sort('-createdAt')
        .select('caption media panchId sanghId postedByMemberId postedByName likes comments createdAt')
        .limit(limit)
        .lean(),
        
      // Vyapar posts
      VyaparPost.find({ ...cursorQuery, isHidden: false })
        .populate('vyaparId', 'name businessType')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media vyaparId postedByUserId likes comments createdAt')
        .limit(limit)
        .lean(),
        
      // Tirth posts
      TirthPost.find({ ...cursorQuery, isHidden: false })
        .populate('tirthId', 'name location')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media tirthId postedByUserId likes comments createdAt')
        .limit(limit)
        .lean(),
        
      // Sadhu posts
      SadhuPost.find({ ...cursorQuery, isHidden: false })
        .populate('sadhuId', 'sadhuName uploadImage')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .select('caption media sadhuId postedByUserId likes comments createdAt')
        .limit(limit)
        .lean()
    ]);
    
    // Add post type for frontend differentiation
    const postsWithTypes = [
      ...userPosts.map(post => ({ ...post, postType: 'user' })),
      ...sanghPosts.map(post => ({ ...post, postType: 'sangh' })),
      ...panchPosts.map(post => ({ ...post, postType: 'panch' })),
      ...vyaparPosts.map(post => ({ ...post, postType: 'vyapar' })),
      ...tirthPosts.map(post => ({ ...post, postType: 'tirth' })),
      ...sadhuPosts.map(post => ({ ...post, postType: 'sadhu' }))
    ];
    
    // Sort all posts by creation date
    const sortedPosts = postsWithTypes.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    ).slice(0, limit);
    
    // Get the next cursor (timestamp of the oldest post)
    const nextCursor = sortedPosts.length > 0 
      ? sortedPosts[sortedPosts.length - 1].createdAt.toISOString() 
      : null;
    
    // Check if there are more posts
    const hasMore = sortedPosts.length === limit;
    
    return successResponse(res, {
      posts: sortedPosts,
      pagination: {
        nextCursor,
        hasMore
      }
    }, 'Combined feed retrieved successfully');
  } catch (error) {
    console.error('Error in getCombinedFeedOptimized:', error);
    return errorResponse(res, 'Error retrieving combined feed', 500, error.message);
  }
});
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
  getReplies,
  deleteMediaItem,
  hidePost,
  unhidePost,
  getCombinedFeed,
  getCombinedFeedOptimized
};
