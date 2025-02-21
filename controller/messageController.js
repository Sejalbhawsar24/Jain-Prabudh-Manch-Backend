// controllers/messageController.js
const Message = require('../model/messageModel');
const User = require('../model/userModel');
const mongoose = require('mongoose');

// Create a new message
exports.createMessage = async (req, res) => {
  try {
    const { sender, receiver, message } = req.body;
    // Validate message content
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);
    if (!senderUser || !receiverUser) {
      return res.status(400).json({ message: 'Sender or receiver not found' });
    }
    const newMessage = new Message({
      sender,
      receiver,
      message,
      createdAt: new Date(),
    });
    await newMessage.save();
    res.status(201).json({ message: 'Message sent successfully', data: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
};

// Get messages between sender and receiver
exports.getMessages = async (req, res) => {
    try {
      const { sender, receiver } = req.query;
      if (!sender || !receiver) {
        return res.status(400).json({ message: 'Sender and receiver are required' });
      }
      const messages = await Message.find({
        $or: [
          { sender, receiver },
          { sender: receiver, receiver: sender },
        ],
      }).sort({ createdAt: 1 });
      res.status(200).json({ message: 'Messages retrieved successfully', data: messages });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving messages', error });
    }
  };
  
// Get all messages for a user
exports.getAllMessages = async (req, res) => {
  try {
    const userId = req.params.userId;
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate('sender', 'fullName profilePicture') 
      .populate('receiver', 'fullName profilePicture')
      .sort({ timestamp: 1 });
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
};

// Get messages by ID (either sender or receiver)
exports.getMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;
    // Find message by ID
    const message = await Message.findById(messageId)
      .populate('sender', 'fullName profilePicture')
      .populate('receiver', 'fullName profilePicture');

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching message', error });
  }
};
// Controller function to get unread messages count
exports.markMessageAsRead = async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      await message.markAsRead();
      res.status(200).json({ message: 'Message marked as read' });
    } catch (error) {
      res.status(500).json({ message: 'Error marking message as read', error });
    }
  };
exports.deleteMessageById = async (req, res) => {
  try {
    console.log("User from token:", req.user);
    const { id } = req.params;
    console.log("Deleting message with ID:", id);
    // Find the message by its ID
    const message = await Message.findById(id);
    // Check if the message exists
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
       const deletedMessage = await Message.findByIdAndDelete(id);
    console.log('Message deleted:', deletedMessage);  // Log deletion for debugging
    res.status(200).json({ message: 'Message deleted successfully', data: deletedMessage });
  } catch (error) {
    console.error('Error deleting message:', error);  // Log error for debugging
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
};

// Update messages by senderId
exports.updateMessagesBySenderId = async (req, res) => {
  try {
    const { senderId } = req.params; 
    const { newMessage } = req.body;
    if (!newMessage) {
      return res.status(400).json({ message: 'New message content is required' });
    }
    const updatedMessages = await Message.updateMany(
      { sender: senderId },
      { $set: { message: newMessage } }
    );
    if (updatedMessages.modifiedCount === 0) {
      return res.status(404).json({ message: 'No messages found to update for this sender' });
    }
    res.status(200).json({ message: 'Messages updated successfully', data: updatedMessages });
  } catch (error) {
    res.status(500).json({ message: 'Error updating messages', error });
  }
};