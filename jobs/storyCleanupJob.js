const Story = require('../model/SocialMediaModels/storyModel');
const User = require('../model/UserRegistrationModels/userModel');
const { DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/s3Config');

// Story cleanup function
const cleanupExpiredStories = async () => {
  try {
    console.log('Running story cleanup job');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find expired stories
    const expiredStories = await Story.find({ 
      createdAt: { $lt: twentyFourHoursAgo } 
    });
    
    if (expiredStories.length === 0) {
      console.log('No expired stories found');
      return;
    }
    
    // Collect S3 keys to delete
    const s3Keys = [];
    const storyIds = [];
    
    expiredStories.forEach(story => {
      storyIds.push(story._id);
      
      if (story.media && story.media.length > 0) {
        story.media.forEach(mediaUrl => {
          // Extract the S3 key from the URL
          const key = mediaUrl.split('.com/')[1];
          if (key) s3Keys.push({ Key: key });
        });
      }
    });
    
    // Delete from S3 if there are keys to delete
    if (s3Keys.length > 0) {
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Delete: { Objects: s3Keys }
      };
      
      await s3Client.send(new DeleteObjectsCommand(deleteParams));
    }
    
    // Remove story references from users
    await User.updateMany(
      { story: { $in: storyIds } },
      { $pull: { story: { $in: storyIds } } }
    );
    
    // Delete stories from database
    await Story.deleteMany({ _id: { $in: storyIds } });
    
    console.log(`Deleted ${expiredStories.length} expired stories and ${s3Keys.length} media files`);
  } catch (error) {
    console.error('Story cleanup job failed:', error);
  }
};

// Schedule the job to run every hour using setInterval
const scheduleStoryCleanup = () => {
  // Run immediately on startup
  cleanupExpiredStories();
  
  // Then run every hour
  setInterval(cleanupExpiredStories, 60 * 60 * 1000);
  
  console.log('Story cleanup job scheduled');
};

module.exports = {
  scheduleStoryCleanup
}; 