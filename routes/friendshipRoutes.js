const express = require('express');
const { 
    followUser, 
    unfollowUser, 
    getFollowers, 
    getFollowing, 
    checkFollowStatus, 
    acceptFollowRequest 
} = require('../controller/friendshipController');

const router = express.Router();

// Follow a user
router.post('/follow', followUser);

// Unfollow a user
router.post('/unfollow', unfollowUser);

// Get all followers of a user
router.get('/followers/:userId', getFollowers);

// Get all users a user is following
router.get('/following/:userId', getFollowing);

// Check follow status
router.post('/follow-status', checkFollowStatus);
// Accept a follow request
router.patch('/accept-follow-request', acceptFollowRequest);

module.exports = router;
