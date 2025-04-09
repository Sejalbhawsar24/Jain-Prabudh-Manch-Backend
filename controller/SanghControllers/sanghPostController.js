const SanghPost = require('../../model/SanghModels/sanghPostModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const asyncHandler = require('express-async-handler');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');
const { getOrSetCache, invalidateCache,invalidatePattern } = require('../../utils/cache');

// Create a post as Sangh
const createSanghPost = asyncHandler(async (req, res) => {
  try {
    const sanghId = req.params.sanghId;
    const userId = req.user._id;
    const officeBearerRole = req.officeBearerRole;
    const { caption } = req.body;
    
    // Validate content
    if (!caption) {
      return errorResponse(res, 'caption is required', 400);
    }
    
    // Process uploaded media
    let mediaFiles = [];
    if (req.files && req.files.media) {
      mediaFiles = req.files.media.map(file => ({
        url: convertS3UrlToCDN(file.location),
        type: file.mimetype.startsWith('image/') ? 'image' : 'video'
      }));
    }
    
    // Create the post
    const post = await SanghPost.create({
      sanghId,
      postedByUserId: userId,
      postedByRole: officeBearerRole,
      caption,
      media: mediaFiles
    });
    
    // Populate Sangh and user details for response
    const populatedPost = await SanghPost.findById(post._id)
      .populate('sanghId', 'name level location')
      .populate('postedByUserId', 'firstName lastName fullName profilePicture');
      await invalidateCache(`sanghPosts:page:1:limit:10`);
      await invalidatePattern(`sanghPosts:${sanghId}:*`);
      await invalidatePattern('allSanghPosts:*');
      await invalidateCache(`sangh:${sanghId}:stats`);
    return successResponse(res, populatedPost, 'Post created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get posts by Sangh ID
const getSanghPosts = asyncHandler(async (req, res) => {
  try {
    const { sanghId } = req.params;  
    const { postId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
  
    const cacheKey = `sanghPosts:${sanghId}:page:${page}:limit:${limit}`;
    // Verify Sangh exists
    const sangh = await HierarchicalSangh.findById(sanghId);
    if (!sangh) {
      return errorResponse(res, 'Sangh not found', 404);
    }
    const query = { sanghId, isHidden: false };
    if (postId) {
      query._id = postId;  // ✅ Sirf ek specific post fetch karega
    }
    // Get posts with pagination
    const posts = await SanghPost.find(query)
    .populate('sanghId', 'name level location')
    .populate('postedByUserId', 'firstName lastName fullName profilePicture')
    .populate('comments.user', 'firstName lastName fullName profilePicture')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit);
    
    const total = await SanghPost.countDocuments({ 
      sanghId,
      isHidden: false 
    });
    
    return successResponse(res, {
      posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }, 'Sangh posts retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get all Sangh posts for social feed
const getAllSanghPosts = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const cacheKey = `sanghPosts:page:${page}:limit:${limit}`;
    // Get all visible Sangh posts
    const result = await getOrSetCache(cacheKey, async () => {
      const posts = await SanghPost.find({ isHidden: false })
        .populate('sanghId', 'name level location')
        .populate('postedByUserId', 'firstName lastName fullName profilePicture')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean();
  
      const total = await SanghPost.countDocuments({ isHidden: false });
  
      return {
        posts,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      };
    }, 180);
  
    result.posts = result.posts.map(post => ({
      ...post,
      media: post.media.map(m => ({
        ...m,
        url: convertS3UrlToCDN(m.url)
      }))
    }));
    
  
    return successResponse(res, result, 'Sangh posts retrieved successfully');
  };
// Toggle like on a Sangh post
const toggleLikeSanghPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    
    const post = await SanghPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }
    
    const result = post.toggleLike(userId);
    await post.save();
    await invalidateCache(`sanghPost:${postId}`);
    await invalidateCache(`sanghPostLikes:${postId}`);
    return successResponse(res, result, `Post ${result.isLiked ? 'liked' : 'unliked'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Add comment to a Sangh post
const commentOnSanghPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    
    if (!text) {
      return errorResponse(res, 'Comment text is required', 400);
    }
    
    const post = await SanghPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }
    
    // Add comment
    const comment = {
      user: userId,
      text,
      createdAt: new Date(),
    };
    post.comments.push(comment);
    await post.save();
    await invalidateCache(`sanghPost:${postId}`);
    await invalidateCache(`sanghPostComments:${postId}`);
    // Populate user details in the comment
    const populatedPost = await SanghPost.findById(postId)
      .populate('comments.user', 'firstName lastName fullName profilePicture');
    
      const populatedComment = populatedPost.comments[populatedPost.comments.length - 1];     
    return successResponse(res, populatedComment, 'Comment added successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
const replyToComment = asyncHandler(async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
      return errorResponse(res, "Reply text is required", 400);
    }

    const post = await SanghPost.findById(postId);
    if (!post) {
      return errorResponse(res, "Post not found", 404);
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return errorResponse(res, "Comment not found", 404);
    }

    // Add reply
    const reply = {
      user: userId,
      text,
      createdAt: new Date(),
    };

    comment.replies.push(reply);
    await post.save();

    // Populate reply with user details
    const updatedPost = await SanghPost.findById(postId)
      .populate("comments.user", "firstName lastName fullName profilePicture")
      .populate("comments.replies.user", "firstName lastName fullName profilePicture");
      await invalidateCache(`sanghPost:${postId}`);
      await invalidateCache(`sanghPostComments:${postId}`);
    const updatedComment = updatedPost.comments.id(commentId);

    return successResponse(res, updatedComment, "Reply added successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Delete a Sangh post (only by the creator or superadmin)
const deleteSanghPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    
    const post = await SanghPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }
    
    // Check if user is authorized to delete
    if (post.postedByUserId.toString() !== userId.toString() && req.user.role !== 'superadmin') {
      return errorResponse(res, 'Not authorized to delete this post', 403);
    }
    
    // Delete media files from S3
    if (post.media && post.media.length > 0) {
      const deletePromises = post.media.map(async (mediaItem) => {
        try {
          const key = extractS3KeyFromUrl(mediaItem.url);
          if (key) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key
            }));
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
    
    await post.deleteOne();
    await invalidateCache(`sanghPosts:page:1:limit:10`);
    await invalidateCache(`sanghPost:${postId}`);
    await invalidatePattern(`sanghPosts:${post.sanghId}:*`);
    await invalidatePattern('allSanghPosts:*');
    return successResponse(res, null, 'Post deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
// Update Sangh post
const updateSanghPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { caption } = req.body;
    const userId = req.user._id;

    const post = await SanghPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }

    // Check authorization
    if (post.postedByUserId.toString() !== userId.toString() && req.user.role !== 'superadmin') {
      return errorResponse(res, 'Not authorized to update this post', 403);
    }

    // If replaceMedia flag is set, delete existing media from S3
    if (req.body.replaceMedia === 'true' && post.media && post.media.length > 0) {
      const deletePromises = post.media.map(async (mediaItem) => {
        try {
          const key = extractS3KeyFromUrl(mediaItem.url);
          if (key) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key
            }));
            console.log(`Successfully deleted file from S3: ${key}`);
          }
        } catch (error) {
          console.error(`Error deleting file from S3: ${mediaItem.url}`, error);
        }
      });
      
      await Promise.all(deletePromises);
      post.media = [];
    }

    // Add new media if provided
    if (req.files && req.files.media) {
      const newMedia = req.files.media.map(file => ({
        url: convertS3UrlToCDN(file.location),
        type: file.mimetype.startsWith('image/') ? 'image' : 'video'
      }));
      
      post.media.push(...newMedia);
    }

    // Update caption
    post.caption = caption;
    await post.save();

    const updatedPost = await SanghPost.findById(postId)
      .populate('sanghId', 'name level location')
      .populate('postedByUserId', 'firstName lastName fullName profilePicture');
      await invalidateCache(`sanghPosts:page:1:limit:10`);
      await invalidateCache(`sanghPost:${postId}`);
await invalidatePattern(`sanghPosts:${post.sanghId}:*`);
await invalidatePattern('allSanghPosts:*');


    return successResponse(res, updatedPost, 'Post updated successfully');
  } catch (error) {
    // If there's an error and new files were uploaded, clean them up
    if (req.files && req.files.media) {
      const deletePromises = req.files.media.map(async (file) => {
        try {
          const key = extractS3KeyFromUrl(file.location);
          if (key) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key
            }));
          }
        } catch (err) {
          console.error(`Error deleting file from S3: ${file.location}`, err);
        }
      });
      await Promise.all(deletePromises);
    }
    return errorResponse(res, error.message, 500);
  }
});
module.exports = {
  createSanghPost,
  getSanghPosts,
  getAllSanghPosts,
  toggleLikeSanghPost,
  commentOnSanghPost,
  deleteSanghPost,
  replyToComment,
  updateSanghPost
}; 