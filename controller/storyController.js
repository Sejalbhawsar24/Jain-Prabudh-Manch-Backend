const Story = require('../model/storyModel');
const User = require('../model/userModel');

exports.createStory = async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        console.log("Uploaded File(s):", req.files);
        const { userId, type } = req.body;
        const mediaFiles = req.files ? req.files.map(file => file.filename) : [];
        if (!userId || !type) {
            return res.status(400).json({ message: "User ID and Type are required" });
        }
        if (mediaFiles.length === 0) {
            return res.status(400).json({ message: "At least one file is required" });
        }
        const newStory = new Story({ userId, media: mediaFiles, type });
        await newStory.save();
        res.status(201).json({ message: "Story uploaded successfully", story: newStory });
    } catch (error) {
        console.error("Error creating story:", error); // Log the error
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
exports.getAllStories = async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        // Fetch only stories from the last 24 hours
        const stories = await Story.find({ createdAt: { $gte: twentyFourHoursAgo } })
            .populate("userId", "profilePicture firstName lastName");
        res.status(200).json(stories);
    } catch (error) {
        console.error("Error fetching stories:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.getStoriesByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const stories = await Story.find({ userId });
        if (!stories.length) {
            return res.status(404).json({ message: 'No stories found for this user' });
        }
        res.json(stories);
    } catch (error) {
        console.error('Error fetching user stories:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.deleteStory = async (req, res) => {
    try {
        const { userId, storyId } = req.params;
        // console.log("Attempting to delete story...");
        // console.log(" Story ID:", storyId);
        // console.log(" User ID:", userId);
    const story = await Story.findOne({ _id: storyId, userId });
        if (!story) {
            console.log("Story not found or unauthorized!");
            return res.status(404).json({ message: "Story not found or unauthorized" });
        }
        //  Delete the story
        await Story.findByIdAndDelete(storyId);
        console.log(" Story deleted successfully from DB");
        //  Remove story reference from User
        await User.findByIdAndUpdate(userId, { $pull: { story: storyId } });
        console.log("Story removed from user's list");
        return res.json({ message: "Story deleted successfully" });
    } catch (error) {
        console.error(" Error deleting story:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
