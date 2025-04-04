// routes/messageRoutes.js
const express = require('express');
const { createMessage, getAllMessages, getMessageById, getMessages, getUnreadMessagesCount, deleteMessagesBySenderId, updateMessagesBySenderId, deleteMessageById, sendImageMessage, updateMessageById } = require('../../controller/SocialMediaControllers/messageController');
const {authenticate} = require('../../middlewares/authMiddlewares')
const upload = require('../../middlewares/upload');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Create a new message
router.post('/create', createMessage);
router.get('/',getMessages)
// Send an image message
router.post('/send-image', upload.single('chatImage'), sendImageMessage);
// Get all messages for a user
router.get('/:userId', getAllMessages);

// Get a specific message by its ID
router.get('/:messageId', getMessageById);
router.delete('/delete/:id', authenticate,deleteMessageById);

// Update messages by senderId
router.put('/update/:messageId',updateMessageById);
// Get unread messages count
router.get('/unread/:userId', getUnreadMessagesCount);

module.exports = router;
