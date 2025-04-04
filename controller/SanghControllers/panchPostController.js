const PanchPost = require('../../model/SanghModels/panchPostModel');
const Panch = require('../../model/SanghModels/panchModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const asyncHandler = require('express-async-handler');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');

// Create a post as Panch member
const createPanchPost = asyncHandler(async (req, res) => {
  try {
    const { caption, panchGroup, sanghId, panchMember } = req.body; // ✅ Updated field names

    if (!caption) return errorResponse(res, 'caption is required', 400);
    if (!panchGroup) return errorResponse(res, 'Panch Group is required', 400);
    if (!sanghId) return errorResponse(res, 'Sangh ID is required', 400);
    if (!panchMember) return errorResponse(res, 'Panch Member is required', 400);

    const panchGroupData = await Panch.findById(panchGroup);
    if (!panchGroupData) return errorResponse(res, 'Panch Group not found', 404);

    const panchMemberData = await User.findById(panchMember);
    if (!panchMemberData) return errorResponse(res, 'Panch Member not found', 404);
    console.log("Fetched User Data:", panchMemberData);
    const firstName = panchMemberData.firstName || 'Unknown'; 
    const lastName = panchMemberData.lastName || '';
    const postedByName = `${firstName} ${lastName}`.trim();
    const postedProfilePicture = panchMemberData.profilePicture || '';
    
    let mediaFiles = [];
    if (req.files?.media) {
      mediaFiles = req.files.media.map(file => ({
        url: file.location,
        type: file.mimetype.startsWith('image/') ? 'image' : 'video'
      }));
    }

    const post = await PanchPost.create({
      panchId: panchGroupData._id,
      sanghId,
      postedByMemberId: panchMemberData._id,
      postedByName,
      postedProfilePicture,
      caption,
      media: mediaFiles
    });

    const populatedPost = await PanchPost.findById(post._id)
      .populate('panchId', 'accessId')
      .populate('sanghId', 'name level location');

    return successResponse(res, populatedPost, 'Post created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});


// Get posts by Panch ID
const getPanchPosts = asyncHandler(async (req, res) => {
  try {
    const { panchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Verify Panch exists
    const panchGroup = await Panch.findById(panchId);
    if (!panchGroup) {
      return errorResponse(res, 'Panch group not found', 404);
    }
    
    // Get posts with pagination
    const posts = await PanchPost.find({ 
      panchId,
      isHidden: false 
    })
      .populate('panchId', 'accessId')
      .populate('sanghId', 'name level location')
      .populate('comments.user', 'firstName lastName fullName profilePicture')
      .populate('comments.replies.user', 'firstName lastName fullName profilePicture')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);
    
    const total = await PanchPost.countDocuments({ 
      panchId,
      isHidden: false 
    });
    
    return successResponse(res, {
      posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }, 'Panch posts retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get all Panch posts for social feed
const getAllPanchPosts = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get all visible Panch posts
    const posts = await PanchPost.find({ isHidden: false })
      .populate("sanghId", "name level location")
      .populate("comments.user", "firstName lastName fullName profilePicture")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(); // Convert mongoose document to plain JSON for better performance

    // Manually extracting required fields from members
    const formattedPosts = posts.map(post => {
      if (post.panchId && post.panchId.members) {
        post.panchId.members = post.panchId.members.map(member => ({
          firstName: member.personalDetails.firstName,
          surname: member.personalDetails.surname,
          profilePhoto: member.documents.profilePhoto,
          mobileNumber: member.personalDetails.mobileNumber,
          jainAadharNumber: member.personalDetails.jainAadharNumber,
        }));
      }
      return post;
    });

    const total = await PanchPost.countDocuments({ isHidden: false });

    return successResponse(res, {
      posts: formattedPosts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    }, "All Panch posts retrieved successfully");
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Toggle like on a Panch post
const toggleLikePanchPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;
    
    const post = await PanchPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }
    
    const result = post.toggleLike(userId);
    await post.save();
    
    return successResponse(res, result, `Post ${result.isLiked ? 'liked' : 'unliked'} successfully`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Add comment to a Panch post
const commentOnPanchPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;
    if (!text) {
      return errorResponse(res, 'Comment text is required', 400);
    }
    const post = await PanchPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }
    const comment = post.addComment(userId, text);
    await post.save();
    // Populate user details in the comment
    const populatedPost = await PanchPost.findById(postId)
      .populate('comments.user', 'firstName lastName fullName profilePicture');
    const populatedComment = populatedPost.comments.id(comment._id);
    return successResponse(res, populatedComment, 'Comment added successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
const replyToComment = asyncHandler(async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { replyText } = req.body;
    const userId = req.user._id;

    if (!replyText) {
      return errorResponse(res, 'Reply text is required', 400);
    }

    // ✅ Post aur comment exist check karo
    const post = await PanchPost.findById(postId);
    if (!post) return errorResponse(res, 'Post not found', 404);

    const comment = post.comments.id(commentId);
    if (!comment) return errorResponse(res, 'Comment not found', 404);

    // ✅ Reply add karo
    const reply = {
      user: userId,
      replyText,
      createdAt: new Date()
    };
    comment.replies.push(reply);
    await post.save(); 

    // ✅ Yeh populate ka sahi tarika hai
    const populatedPost = await PanchPost.findById(postId)
      .populate('comments.user', 'firstName lastName fullName profilePicture')
      .populate({
        path: 'comments.replies.user', 
        select: 'firstName lastName fullName profilePicture'
      });

    const populatedReply = populatedPost.comments.id(commentId).replies.slice(-1)[0]; // ✅ Get last added reply

    return successResponse(res, populatedReply, 'Reply added successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});


// Delete a Panch post (only by the creator or superadmin)
const deletePanchPost = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const panchMember = req.panchMember || {}; 

    const post = await PanchPost.findById(postId);
    if (!post) {
      return errorResponse(res, 'Post not found', 404);
    }
    
    // Check if user is authorized to delete
      const isAuthorized = panchMember._id && post.postedByMemberId.toString() === panchMember._id.toString();
    if (!isAuthorized && req.user.role !== 'superadmin') {
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
    
    return successResponse(res, null, 'Post deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get Panch member access key
const getPanchMemberAccessKey = asyncHandler(async (req, res) => {
  try {
    const { panchId, jainAadharNumber } = req.body;
    
    // Find the Panch group
    const panchGroup = await Panch.findById(panchId);
    if (!panchGroup) {
      return errorResponse(res, 'Panch group not found', 404);
    }
    
    // Find the member by Jain Aadhar number
    const member = panchGroup.members.find(m => 
      m.personalDetails.jainAadharNumber === jainAadharNumber && 
      m.status === 'active'
    );
    
    if (!member) {
      return errorResponse(res, 'Member not found or inactive', 404);
    }
    
    return successResponse(res, {
      accessKey: member.accessKey,
      memberName: `${member.personalDetails.firstName} ${member.personalDetails.surname}`
    }, 'Access key retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = {
  createPanchPost,
  getPanchPosts,
  getAllPanchPosts,
  toggleLikePanchPost,
  commentOnPanchPost,
  deletePanchPost,
  getPanchMemberAccessKey,
  replyToComment
}; 