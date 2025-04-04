const Friendship = require('../../model/SocialMediaModels/friendshipModel');
const asyncHandler = require('express-async-handler');
const Notification = require('../../model/SocialMediaModels/notificationModel');

// Follow a user
const followUser = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.body;
    const existingFriendship = await Friendship.findOne({ follower: followerId, following: followingId });
    if (existingFriendship) {
        return res.status(400).json({ message: 'Already following this user' });
    }
    const newFriendship = await Friendship.create({ follower: followerId, following: followingId, followStatus: 'following' });
    res.status(201).json({ message: 'User followed successfully', friendship: newFriendship });
});

const getFollowRequests = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const requests = await Friendship.find({ following: userId, followStatus: 'following' })
        .populate('follower', 'firstName lastName profilePicture');
    res.json({ success: true, requests });
});


// Unfollow a user
const unfollowUser = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.body;
    console.log("Unfollow Request Received:", followerId, followingId);
    // Follow Relationship Delete
    const friendship = await Friendship.findOneAndDelete({ follower: followerId, following: followingId });
    if (!friendship) {
        return res.status(404).json({ message: "Follow relationship not found" });
    }
    try {
        // Follow notification delete
        const notificationToDelete = await Notification.findOne({
            senderId: followerId,
            receiverId: followingId,
            type: "follow",
        });
        console.log("Notification Found for Deletion:", notificationToDelete); // Debugging
        if (notificationToDelete) {
            const deleteResult = await Notification.deleteOne({ _id: notificationToDelete._id });
            console.log("Deleted Notification Count:", deleteResult.deletedCount);
            return res.status(200).json({
                message: "User unfollowed successfully, follow notification removed",
                followStatus: "follow",
                notificationDeleted: deleteResult.deletedCount > 0 ? true : false,
            });
        } else {
            return res.status(200).json({
                message: "User unfollowed successfully, but no follow notification found",
                followStatus: "follow",
            });
        }
    } catch (error) {
        console.error("Error deleting notification:", error);
        return res.status(500).json({ message: "Error deleting notification" });
    }
});
const getFollowers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    try {
        const followers = await Friendship.find({ following: userId })
            .populate('follower', 'firstName lastName profilePicture');
        res.status(200).json({
            success: true,
            count: followers.length,
            followers: followers.map(f => ({
                id: f.follower._id,
                firstName: f.follower.firstName,
                lastName: f.follower.lastName,
                profilePicture: f.follower.profilePicture,
                followStatus: "following"
            }))
        });
    } catch (error) {
        console.error("Error fetching followers:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

const getFollowing = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    try {
        const following = await Friendship.find({ follower: userId })
            .populate('following', 'firstName lastName profilePicture'); 
        res.status(200).json({
            success: true,
            count: following.length,
            following: following.map(f => ({
                id: f.following._id,
                firstName: f.following.firstName,
                lastName: f.following.lastName,
                profilePicture: f.following.profilePicture,
                followStatus: "following" 
            }))
        });
    } catch (error) {
        console.error("Error fetching following:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Check if a user is following another user
const checkFollowStatus = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.body;
    const existingFriendship = await Friendship.findOne({ follower: followerId, following: followingId });
    if (existingFriendship) {
        return res.status(200).json({ status: existingFriendship.status });
    }
    return res.status(200).json({ status: 'not-following' });
});

// Accept a follow request
const acceptFollowRequest = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.body;
    const updatedFriendship = await Friendship.findOneAndUpdate(
        { follower: followerId, following: followingId, status: 'pending' },
        { status: 'accepted' },
        { new: true }
    );
    if (!updatedFriendship) {
        return res.status(404).json({ message: 'Follow request not found or already accepted' });
    }
    res.status(200).json({ message: 'Follow request accepted', friendship: updatedFriendship });
});

module.exports = {
    followUser,
    getFollowRequests,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkFollowStatus,
    acceptFollowRequest,
};
