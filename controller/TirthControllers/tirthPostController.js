const TirthPost = require('../../model/TirthModels/tirthPostModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');
const { getOrSetCache, invalidateCache,invalidatePattern } = require('../../utils/cache');
const { convertS3UrlToCDN } = require('../../utils/s3Utils');

// Create new Tirth post
const createPost = async (req, res) => {
    try {
        const { tirthId } = req.params;
        const { caption } = req.body;

        // Handle uploaded media files
        const media = [];
        
        if (req.files) {
            // Handle images
            if (req.files.image) {
                media.push(...req.files.image.map(file => ({
                    type: 'image',
                    url: convertS3UrlToCDN(file.location)
                })));
            }
            
            // Handle videos
            if (req.files.video) {
                media.push(...req.files.video.map(file => ({
                    type: 'video',
                    url: convertS3UrlToCDN(file.location)
                })));
            }
        }

        const postData = {
            tirthId,
            caption,
            media,
            postedByUserId: req.user._id
        };

        const post = new TirthPost(postData);
        await post.save();

        await post.populate('postedByUserId', 'firstName lastName profilePicture');

        return successResponse(res, {
            message: 'Post created successfully',
            post
        });
    } catch (error) {
        // If there's an error, clean up any uploaded files
        if (req.files) {
            const deletePromises = [];
            if (req.files.image) {
                deletePromises.push(...req.files.image.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            if (req.files.video) {
                deletePromises.push(...req.files.video.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            
            try {
                await Promise.all(deletePromises);
            } catch (deleteError) {
                console.error('Error deleting files:', deleteError);
            }
        }
        
        return errorResponse(res, 'Failed to create post', 500, error.message);
    }
};
// Get All Tirth Posts
const getAllTirthPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const posts = await TirthPost.find({ isHidden: false }) // 🔥 tirthId filter removed
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('postedByUserId', 'firstName lastName profilePicture')
            .populate('comments.user', 'firstName lastName profilePicture');

        const total = await TirthPost.countDocuments({ isHidden: false });

        return successResponse(res, {
            posts,
            totalPosts: total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Get Tirth posts
const getTirthPosts = async (req, res) => {
    const { tirthId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
  
    const cacheKey = `tirthPosts:${tirthId}:page:${page}:limit:${limit}`;
  
    const result = await getOrSetCache(cacheKey, async () => {
      const posts = await TirthPost.find({ tirthId, isHidden: false })
        .populate('tirthId', 'name location')
        .populate('postedByUserId', 'firstName lastName profilePicture')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean();
  
      const total = await TirthPost.countDocuments({ tirthId, isHidden: false });
  
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
    
  
    return successResponse(res, result, 'Tirth posts fetched successfully');
  };
// Get a single Tirth post
const getPost = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await TirthPost.findOne({
            _id: postId,
            isHidden: false
        })
        .populate('postedByUserId', 'firstName lastName profilePicture')
        .populate('comments.user', 'firstName lastName profilePicture')
        .populate('comments.replies.user', 'firstName lastName profilePicture');

        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }
        
        post.media = post.media.map(m => ({
            ...m,
            url: convertS3UrlToCDN(m.url)
          }));
          

        return successResponse(res, post);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};


// Update post
const updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { caption } = req.body;

        // Remove fields that shouldn't be updated
        const updateData = {
            caption
        };

        const post = await TirthPost.findOne({
            _id: postId,
            isHidden: false
        });

        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        // Check if user is authorized to update this post
        if (post.postedByUserId.toString() !== req.user._id.toString()) {
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
                    }
                } catch (error) {
                    console.error(`Error deleting file from S3: ${mediaItem.url}`, error);
                }
            });
            
            await Promise.all(deletePromises);
            post.media = [];
        }

        // Add new media if provided
        if (req.files) {
            if (req.files.image) {
                post.media.push(...req.files.image.map(file => ({
                    type: 'image',
                    url: convertS3UrlToCDN(file.location)
                })));
            }
            if (req.files.video) {
                post.media.push(...req.files.video.map(file => ({
                    type: 'video',
                    url: convertS3UrlToCDN(file.location)

                })));
            }
        }

        // Update other fields
        Object.assign(post, updateData);
        await post.save();

        await post.populate('postedByUserId', 'firstName lastName profilePicture')
                 .populate('comments.user', 'firstName lastName profilePicture')
                 .populate('comments.replies.user', 'firstName lastName profilePicture');
                 await invalidateCache(`tirthPosts:${req.params.tirthId}:page:1:limit:10`);
        return successResponse(res, {
            message: 'Post updated successfully',
            post
        });
    } catch (error) {
        // If there's an error and new files were uploaded, clean them up
        if (req.files) {
            const deletePromises = [];
            if (req.files.image) {
                deletePromises.push(...req.files.image.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            if (req.files.video) {
                deletePromises.push(...req.files.video.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            await Promise.all(deletePromises);
        }
        return errorResponse(res, error.message, 500);
    }
};

// Delete post
const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await TirthPost.findOne({
            _id: postId,
            isHidden: false
        });

        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        // Check if user is authorized to delete this post
        if (post.postedByUserId.toString() !== req.user._id.toString()) {
            return errorResponse(res, 'Not authorized to delete this post', 403);
        }

        // Set post to hidden instead of deleting media files
        post.isHidden = true;
        await post.save();
        await invalidateCache(`tirthPosts:${req.params.tirthId}:page:1:limit:10`);

        return successResponse(res, {
            message: 'Post deleted successfully'
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Like/Unlike post
const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await TirthPost.findOne({
            _id: postId,
            isHidden: false
        });

        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        const result = post.toggleLike(userId);
        await post.save();

        return successResponse(res, {
            message: result.isLiked ? 'Post liked' : 'Post unliked',
            isLiked: result.isLiked,
            likeCount: result.likeCount
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Add comment
const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text) {
            return errorResponse(res, 'Comment text is required', 400);
        }

        const post = await TirthPost.findById(postId);
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        const comment = post.addComment(userId, text);
        await post.save();

        // Populate the user info for the new comment
        await post.populate('comments.user', 'firstName lastName profilePicture');
        
        // Find the newly added comment
        const newComment = post.comments.id(comment._id);

        return successResponse(res, {
            message: 'Comment added successfully',
            comment: newComment
        });
    } catch (error) {
        return errorResponse(res, 'Failed to add comment', 500, error.message);
    }
};

// Delete comment
const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const post = await TirthPost.findOneAndUpdate(
            {
                _id: postId,
                isHidden: false,
                'comments._id': commentId,
                'comments.user': req.user._id
            },
            {
                $pull: {
                    comments: { _id: commentId }
                }
            },
            { new: true }
        )
        .populate('comments.user', 'firstName lastName profilePicture');

        if (!post) {
            return errorResponse(res, 'Comment not found or unauthorized', 404);
        }

        return successResponse(res, {
            message: 'Comment deleted successfully',
            comments: post.comments
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Add a reply to a comment
const addReply = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text) {
            return errorResponse(res, 'Reply text is required', 400);
        }

        const post = await TirthPost.findById(postId);
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return errorResponse(res, 'Comment not found', 404);
        }

        // Add reply to the comment
        const reply = {
            user: userId,
            text,
            createdAt: new Date()
        };

        comment.replies.push(reply);
        await post.save();

        // Populate user info for the reply
        await post.populate('comments.replies.user', 'firstName lastName profilePicture');
        
        // Get the updated comment with the new reply
        const updatedComment = post.comments.id(commentId);
        const newReply = updatedComment.replies[updatedComment.replies.length - 1];

        return successResponse(res, {
            message: 'Reply added successfully',
            reply: newReply
        });
    } catch (error) {
        return errorResponse(res, 'Failed to add reply', 500, error.message);
    }
};

// Get replies for a comment
const getReplies = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const post = await TirthPost.findById(postId);
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            return errorResponse(res, 'Comment not found', 404);
        }

        // Populate user info for replies
        await post.populate('comments.replies.user', 'firstName lastName profilePicture');
        
        // Get the updated comment with populated replies
        const updatedComment = post.comments.id(commentId);

        return successResponse(res, {
            replies: updatedComment.replies
        });
    } catch (error) {
        return errorResponse(res, 'Failed to get replies', 500, error.message);
    }
};

// Delete a reply from a comment
const deleteReply = async (req, res) => {
    try {
        const { postId, commentId, replyId } = req.params;

        const post = await TirthPost.findOneAndUpdate(
            {
                _id: postId,
                'comments._id': commentId,
                'comments.replies._id': replyId,
                'comments.replies.user': req.user._id
            },
            {
                $pull: {
                    'comments.$.replies': { _id: replyId }
                }
            },
            { new: true }
        )
        .populate('comments.replies.user', 'firstName lastName profilePicture');

        if (!post) {
            return errorResponse(res, 'Reply not found or unauthorized', 404);
        }

        const updatedComment = post.comments.id(commentId);

        return successResponse(res, {
            message: 'Reply deleted successfully',
            replies: updatedComment.replies
        });
    } catch (error) {
        return errorResponse(res, 'Failed to delete reply', 500, error.message);
    }
};

// Delete a specific media item from a post
const deleteMedia = async (req, res) => {
    try {
        const { postId, mediaUrl } = req.body;

        // Find the post
        const post = await TirthPost.findById(postId);
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        // Check if user is authorized to update this post
        if (post.postedByUserId.toString() !== req.user._id.toString()) {
            return errorResponse(res, 'Not authorized to update this post', 403);
        }

        // Find the media item
        const mediaIndex = post.media.findIndex(item => item.url === mediaUrl);
        if (mediaIndex === -1) {
            return errorResponse(res, 'Media not found in post', 404);
        }

        // Extract the S3 key from the URL
        const s3Key = extractS3KeyFromUrl(mediaUrl);

        // Delete from S3
        try {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: s3Key
            }));
        } catch (s3Error) {
            console.error('Error deleting media from S3:', s3Error);
            // Continue with removing from DB even if S3 deletion fails
        }

        // Remove the media item from the post
        post.media.splice(mediaIndex, 1);
        await post.save();

        return successResponse(res, {
            message: 'Media deleted successfully',
            post
        });
    } catch (error) {
        return errorResponse(res, 'Failed to delete media', 500, error.message);
    }
};

// Hide/Unhide a post
const toggleHidePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { isHidden } = req.body;

        const post = await TirthPost.findById(postId);
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        // Check if user is authorized to update this post
        if (post.postedByUserId.toString() !== req.user._id.toString()) {
            return errorResponse(res, 'Not authorized to update this post', 403);
        }

        post.isHidden = isHidden;
        await post.save();

        return successResponse(res, {
            message: isHidden ? 'Post hidden successfully' : 'Post unhidden successfully',
            post
        });
    } catch (error) {
        return errorResponse(res, 'Failed to update post visibility', 500, error.message);
    }
};

module.exports = {
    createPost,
    getPosts: getTirthPosts,
    getPostById: getPost,
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
    getAllTirthPosts
};