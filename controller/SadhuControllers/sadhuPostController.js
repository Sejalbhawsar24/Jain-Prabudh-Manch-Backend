const SadhuPost = require('../../model/SadhuModels/sadhuPostModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');
const { convertS3UrlToCDN } = require('../../utils/s3Utils');
const { getOrSetCache, invalidateCache, invalidatePattern } = require('../../utils/cache');


// Create post
const createSadhuPost = async (req, res) => {
    try {
        // console.log("Sadhu Object:", req.sadhu);
        // console.log("User Object:", req.user);        
        const { caption } = req.body;
        
        const postData = {
            sadhuId: req.sadhu._id,
            caption,
            postedByUserId: req.user._id
        };
        console.log("Post Data:", postData);
        // Handle media uploads
        if (req.files) {
            const media = [];
            
            // Handle images
            if (req.files.image) {
                media.push(...req.files.image.map(file => ({
                    type: 'image',
                    url: file.location
                })));
            }
            
            // Handle videos
            if (req.files.video) {
                media.push(...req.files.video.map(file => ({
                    type: 'video',
                    url: file.location
                })));
            }
            
            postData.media = media;
        }

        const post = new SadhuPost(postData);
        await post.save();

        await post.populate('postedByUserId', 'firstName lastName profilePicture');
        await invalidateCache(`sadhuPosts:${req.sadhu._id}:page:1:limit:10`);
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
// Get all sadhu posts (public)
const getAllSadhuPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = `allSadhuPosts:page:${page}:limit:${limit}`;

        const result = await getOrSetCache(cacheKey, async () => {
            const posts = await SadhuPost.find({ isHidden: false })
                .populate('sadhuId', 'sadhuName uploadImage')
                .populate('postedByUserId', 'firstName lastName profilePicture')
                .populate('comments.user', 'firstName lastName profilePicture')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await SadhuPost.countDocuments({ isHidden: false });

            return {
                posts,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            };
        }, 180); // 3-minute cache

        result.posts = result.posts.map(post => ({
            ...post,
            media: post.media.map(m => ({
              ...m,
              url: convertS3UrlToCDN(m.url)
            }))
          }));
          

        return successResponse(res, result, 'All Sadhu posts fetched');
    } catch (error) {
        return errorResponse(res, 'Failed to fetch Sadhu posts', 500, error.message);
    }
};

// Get posts by sadhu ID (public)
const getSadhuPosts = async (req, res) => {
    try {
        const { sadhuId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const posts = await SadhuPost.find({ 
            sadhuId,
            isHidden: false 
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sadhuId', 'sadhuName uploadImage')
        .populate('postedByUserId', 'firstName lastName profilePicture')
        .populate('comments.user', 'firstName lastName profilePicture');

        const total = await SadhuPost.countDocuments({
            sadhuId,
            isHidden: false
        });

        return successResponse(res, {
            posts,
            totalPosts: total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Toggle like on post
const toggleLikeSadhuPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user._id;

        const post = await SadhuPost.findOne({
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
        return errorResponse(res, error.message);
    }
};

// Comment on post
const commentOnSadhuPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text) {
            return errorResponse(res, 'Comment text is required', 400);
        }

        const post = await SadhuPost.findById(postId);
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

// Delete post
const deleteSadhuPost = async (req, res) => {
    try {
        console.log("🗑️ Deleting Post from Database");

        if (!req.sadhu || !req.sadhu._id) {
            return errorResponse(res, 'Unauthorized: Sadhu ID not found', 401);
        }

        const { postId } = req.params;

        const post = await SadhuPost.findOne({ 
            _id: postId,
            sadhuId: req.sadhu._id
        });

        if (!post) {
            return errorResponse(res, 'Post not found or unauthorized', 404);
        }

        await SadhuPost.deleteOne({ _id: postId });

        return successResponse(res, { message: 'Post deleted successfully' });

    } catch (error) {
        return errorResponse(res, error.message);
    }
};


// Delete comment
const deleteSadhuComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const post = await SadhuPost.findOneAndUpdate(
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

// Get post by ID
const getSadhuPostById = async (req, res) => {
    try {
        const { postId } = req.params;
        
        const post = await SadhuPost.findOne({ 
            _id: postId, 
            isHidden: false 
        })
        .populate('sadhuId', 'sadhuName uploadImage')
        .populate('postedByUserId', 'firstName lastName profilePicture')
        .populate('comments.user', 'firstName lastName profilePicture')
        .populate('comments.replies.user', 'firstName lastName profilePicture');
            
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }
        
        return successResponse(res, post);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Update post
const updateSadhuPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { caption } = req.body;
        
        const post = await SadhuPost.findOne({ 
            _id: postId,
            sadhuId: req.sadhu._id,
            isHidden: false
        });
        
        if (!post) {
            return errorResponse(res, 'Post not found or unauthorized', 404);
        }
        
        // Update caption if provided
        if (caption) {
            post.caption = caption;
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
        
        // Handle new media uploads if any
        if (req.files) {
            if (req.files.image) {
                post.media.push(...req.files.image.map(file => ({
                    type: 'image',
                    url: file.location
                })));
            }
            
            if (req.files.video) {
                post.media.push(...req.files.video.map(file => ({
                    type: 'video',
                    url: file.location
                })));
            }
        }
        
        await post.save();
        
        // Populate the updated post
        await post.populate('sadhuId', 'sadhuName uploadImage')
                 .populate('postedByUserId', 'firstName lastName profilePicture')
                 .populate('comments.user', 'firstName lastName profilePicture')
                 .populate('comments.replies.user', 'firstName lastName profilePicture');
        
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

// Add a reply to a comment
const addSadhuReply = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text) {
            return errorResponse(res, 'Reply text is required', 400);
        }

        const post = await SadhuPost.findById(postId);
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
const getSadhuReplies = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const post = await SadhuPost.findById(postId);
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
const deleteSadhuReply = async (req, res) => {
    try {
        const { postId, commentId, replyId } = req.params;

        const post = await SadhuPost.findOneAndUpdate(
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
const deleteSadhuMedia = async (req, res) => {
    try {
        const { postId, mediaUrl } = req.body;

        // Find the post
        const post = await SadhuPost.findById(postId);
        if (!post) {
            return errorResponse(res, 'Post not found', 404);
        }

        // Check if user is authorized to update this post
        if (post.sadhuId.toString() !== req.sadhu._id.toString()) {
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
const toggleHideSadhuPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { isHidden } = req.body;

        const post = await SadhuPost.findOne({
            _id: postId,
            sadhuId: req.sadhu._id
        });
        
        if (!post) {
            return errorResponse(res, 'Post not found or unauthorized', 404);
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
    createSadhuPost,
    getSadhuPosts,
    getSadhuPostById,
    updateSadhuPost,
    toggleLikeSadhuPost,
    commentOnSadhuPost,
    deleteSadhuPost,
    getAllSadhuPosts,
    deleteSadhuComment,
    addSadhuReply,
    getSadhuReplies,
    deleteSadhuReply,
    deleteSadhuMedia,
    toggleHideSadhuPost
};
