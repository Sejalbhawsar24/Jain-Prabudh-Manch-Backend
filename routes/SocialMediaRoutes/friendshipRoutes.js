const express = require('express');
const { 
    followUser, 
    unfollowUser, 
    getFollowers, 
    getFollowing, 
    checkFollowStatus, 
    acceptFollowRequest, 
    getFollowRequests
} = require('../../controller/SocialMediaControllers/friendshipController');
const { authMiddleware } = require('../../middlewares/authMiddlewares')
const rateLimit = require('express-rate-limit');
const router = express.Router();

router.use(authMiddleware);

// Rate limiting for follow/unfollow actions to prevent abuse
const followActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each user to 30 follow/unfollow actions per 15 minutes
    message: {
        success: false,
        message: 'Too many follow/unfollow actions. Please try again later.'
    },
    standardHeaders: true,
    keyGenerator: (req) => req.user ? req.user.id : req.ip
});

// Follow a user
router.post('/follow', followActionLimiter, followUser);
// Unfollow a user
router.post('/unfollow', followActionLimiter, unfollowUser);
// Get all followers of a user
router.get('/followers/:userId', getFollowers);
// Get all users a user is following
router.get('/following/:userId', getFollowing);
//get follow request
router.get('/follow-requests/:userId',getFollowRequests)
// Check follow status
router.post('/follow-status', checkFollowStatus);
// Accept a follow request
router.patch('/accept', acceptFollowRequest);

module.exports = router;
