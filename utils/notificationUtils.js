const Notification = require('../model/SocialMediaModels/notificationModel');
const { getIo } = require('../websocket/socket');

/**
 * Create and send a notification
 * @param {Object} data - Notification data
 * @param {string} data.senderId - User ID of the sender
 * @param {string} data.receiverId - User ID of the receiver
 * @param {string} data.type - Notification type (like, comment, reply, mention)
 * @param {string} data.message - Notification message
 * @param {string} data.entityId - ID of related entity (post, comment, etc.)
 * @param {string} data.entityType - Type of entity (post, sanghPost, etc.)
 * @returns {Promise<Object|null>} The created notification or null if error
 */
const createNotification = async (data) => {
  try {
    // Don't create notification if sender and receiver are the same
    if (data.senderId.toString() === data.receiverId.toString()) {
      return null;
    }

    // Create notification in database
    const notification = new Notification({
      senderId: data.senderId,
      receiverId: data.receiverId,
      type: data.type,
      message: data.message,
      entityId: data.entityId,
      entityType: data.entityType
    });
    
    await notification.save();
    
    // Send real-time notification via WebSocket
    const io = getIo();
    if (io) {
      io.to(data.receiverId.toString()).emit('newNotification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw - we don't want notifications to break core functionality
    return null;
  }
};

/**
 * Create like notification
 * @param {Object} data - Like notification data
 * @param {string} data.senderId - User who liked
 * @param {string} data.receiverId - Post owner
 * @param {string} data.entityId - Post ID
 * @param {string} data.entityType - Post type
 * @param {string} data.senderName - Name of the user who liked
 * @returns {Promise<Object|null>} The created notification or null if error
 */
const createLikeNotification = async (data) => {
  return createNotification({
    senderId: data.senderId,
    receiverId: data.receiverId,
    type: 'like',
    message: `${data.senderName} liked your ${data.entityType.replace('Post', ' post')}`,
    entityId: data.entityId,
    entityType: data.entityType
  });
};

/**
 * Create comment notification
 * @param {Object} data - Comment notification data
 * @param {string} data.senderId - User who commented
 * @param {string} data.receiverId - Post owner
 * @param {string} data.entityId - Post ID
 * @param {string} data.entityType - Post type
 * @param {string} data.senderName - Name of the user who commented
 * @returns {Promise<Object|null>} The created notification or null if error
 */
const createCommentNotification = async (data) => {
  return createNotification({
    senderId: data.senderId,
    receiverId: data.receiverId,
    type: 'comment',
    message: `${data.senderName} commented on your ${data.entityType.replace('Post', ' post')}`,
    entityId: data.entityId,
    entityType: data.entityType
  });
};

/**
 * Create reply notification
 * @param {Object} data - Reply notification data
 * @param {string} data.senderId - User who replied
 * @param {string} data.receiverId - Comment owner
 * @param {string} data.entityId - Comment ID
 * @param {string} data.postId - Post ID
 * @param {string} data.entityType - Post type
 * @param {string} data.senderName - Name of the user who replied
 * @returns {Promise<Object|null>} The created notification or null if error
 */
const createReplyNotification = async (data) => {
  return createNotification({
    senderId: data.senderId,
    receiverId: data.receiverId,
    type: 'reply',
    message: `${data.senderName} replied to your comment`,
    entityId: data.entityId,
    entityType: data.entityType
  });
};

/**
 * Create suggestion notification
 * @param {Object} data - Suggestion notification data
 * @param {string} data.senderId - User who submitted the suggestion
 * @param {string} data.receiverId - User who will receive the suggestion
 * @param {string} data.entityId - Suggestion ID
 * @param {string} data.subject - Subject of the suggestion
 * @param {string} data.senderName - Name of the user who submitted
 * @returns {Promise<Object|null>} The created notification or null if error
 */
const createSuggestionNotification = async (data) => {
  try {
    return await createNotification({
      senderId: data.senderId,
      receiverId: data.receiverId,
      type: 'suggestion',
      message: `${data.senderName} has sent you a suggestion: "${data.subject}"`,
      entityId: data.entityId,
      entityType: 'SuggestionComplaint'
    });
  } catch (error) {
    console.error('Error creating suggestion notification:', error);
    return null;
  }
};

/**
 * Create complaint notification
 * @param {Object} data - Complaint notification data
 * @param {string} data.senderId - User who submitted the complaint
 * @param {string} data.receiverId - User who will receive the complaint
 * @param {string} data.entityId - Complaint ID
 * @param {string} data.subject - Subject of the complaint
 * @param {string} data.senderName - Name of the user who submitted
 * @returns {Promise<Object|null>} The created notification or null if error
 */
const createComplaintNotification = async (data) => {
  try {
    return await createNotification({
      senderId: data.senderId,
      receiverId: data.receiverId,
      type: 'complaint',
      message: `${data.senderName} has filed a complaint: "${data.subject}"`,
      entityId: data.entityId,
      entityType: 'SuggestionComplaint'
    });
  } catch (error) {
    console.error('Error creating complaint notification:', error);
    return null;
  }
};

module.exports = {
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createReplyNotification,
  createSuggestionNotification,
  createComplaintNotification
};
