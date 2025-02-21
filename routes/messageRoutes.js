// routes/messageRoutes.js
const express = require('express');
const { createMessage, getAllMessages, getMessageById, getMessages, getUnreadMessagesCount, deleteMessagesBySenderId, updateMessagesBySenderId, deleteMessageById } = require('../controller/messageController');
const { authenticate } = require('../middlewares/authMiddlewares');
const router = express.Router();

// Create a new message
router.post('/create', createMessage);
router.get('/',getMessages)
// Get all messages for a user
router.get('/:userId', getAllMessages);

// Get a specific message by its ID
router.get('/:messageId', getMessageById);
router.delete('/delete/:id', authenticate,deleteMessageById);

// Update messages by senderId
router.put('/update/:senderId', updateMessagesBySenderId);
module.exports = router;
