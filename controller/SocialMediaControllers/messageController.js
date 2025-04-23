// controllers/messageController.js
const Message = require('../../model/SocialMediaModels/messageModel');
const User = require('../../model/UserRegistrationModels/userModel');
const Conversation = require('../../model/SocialMediaModels/conversationModel')
const mongoose = require('mongoose');
const {getIo, getUserStatus}  = require('../../websocket/socket');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { getOrSetCache,invalidateCache } = require('../../utils/cache');
const { convertS3UrlToCDN } = require('../../utils/s3Utils');

// Create a new message
exports.createMessage = async (req, res) => {
  try {
     // Trim the sender and receiver IDs to remove any extra spaces
     const sender = req.body.sender.trim();
     const receiver = req.body.receiver.trim();
     const message = req.body.message;
    // Validate message content
    if (!message || message.trim() === "") {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

     // Verify sender matches authenticated user
     if (sender !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Sender ID must match authenticated user' 
      });
    }
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);
    if (!senderUser || !receiverUser) {
      // Delete uploaded file if users not found
      if (req.file) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: req.file.key
        }));
      }
      return errorResponse(res, 'Sender or receiver not found', 400);
    }
    const conversationCacheKey = `conversation:${sender}:${receiver}`;
    // Find or create conversation
    let conversation = await getOrSetCache(conversationCacheKey, async () => {
      return await Conversation.findOne({
        participants: { $all: [sender, receiver] }
      });
    }, 300);
    if (!conversation) {
      conversation = new Conversation({
        participants: [sender, receiver]
      });
      await conversation.save();
    }
    // Create message object - encryption happens automatically via schema middleware
    const messageData = {
      sender,
      receiver,
      message: message,
      attachments: req.file ? [{
        type: 'image',
        url: convertS3UrlToCDN(req.file.location),
        name: req.file.originalname,
        size: req.file.size
      }] : [],
      createdAt: new Date()
    };
    const newMessage = new Message(messageData);
    await newMessage.save();
    // Update conversation
    conversation.messages.push(newMessage._id);
    conversation.lastMessage = newMessage._id;
    await conversation.save();
    await invalidateCache(`conversation:${sender}:${receiver}`);
    await invalidateCache(`conversation:${receiver}:${sender}`); 
    // Get decrypted message for socket emission
    const decryptedMessage = newMessage.decryptedMessage;
      // Emit real-time message event
      const io = getIo();
      io.to(receiver.toString()).emit('newMessage', {
        message: {
          ...newMessage.toObject(),
          message: decryptedMessage // Send decrypted message in real-time
        },
        sender: {
          _id: senderUser._id,
          fullName: `${senderUser.firstName} ${senderUser.lastName}`,
          profilePicture: senderUser.profilePicture
        }
      });

      return successResponse(res, {
        ...newMessage.toObject(),
        message: decryptedMessage // Send decrypted message in response
      }, 'Message sent successfully', 201);
    } catch (error) {
      // Delete uploaded file if message creation fails
      if (req.file) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (deleteError) {
          console.error('Error deleting file:', deleteError);
        }
      }
      console.error('Message creation error:', error);
      return errorResponse(res, 'Error sending message', 500, error.message);
    }
  };

// Get messages between sender and receiver
// exports.getMessages = async (req, res) => {
//   try {
//     const { sender, receiver, limit = 20, cursor } = req.query;

//     if (!sender || !receiver) {
//       return errorResponse(res, 'Sender and receiver are required', 400);
//     }

//     const cacheKey = cursor 
//       ? `messages:${sender}:${receiver}:cursor:${cursor}:limit:${limit}`
//       : `messages:${sender}:${receiver}:recent:limit:${limit}`;

//     const result = await getOrSetCache(cacheKey, async () => {
//       // Base query condition
//       const queryCondition = {
//         $or: [
//           { sender, receiver },
//           { sender: receiver, receiver: sender },
//         ]
//       };

//       // Add cursor condition if provided
//       if (cursor) {
//         queryCondition.createdAt = { $lt: new Date(cursor) };
//       }

//       const messages = await Message.find(queryCondition)
//         .sort({ createdAt: -1 })
//         .limit(parseInt(limit))
//         .populate('sender', 'fullName profilePicture')
//         .populate('receiver', 'fullName profilePicture');

//       // Mark messages as read (only for recent messages)
//       if (!cursor) {
//         await Message.updateMany(
//           { sender: receiver, receiver: sender, isRead: false },
//           { isRead: true }
//         );
//       }

//       // Get the oldest timestamp for next cursor
//       const nextCursor = messages.length > 0 
//         ? messages[messages.length - 1].createdAt.toISOString() 
//         : null;

//       return {
//         messages: messages.reverse(), // chronological order
//         pagination: {
//           nextCursor,
//           hasMore: messages.length === parseInt(limit)
//         }
//       };
//     }, 180); // TTL 3 mins

//     // Emit read receipt
//     const io = getIo();
//     io.to(receiver.toString()).emit('messagesRead', { sender, receiver });
  
//     const senderStatus = getUserStatus(sender);
//     const receiverStatus = getUserStatus(receiver);

//     result.participants = {
//       [sender]: senderStatus,
//       [receiver]: receiverStatus
//     };
//     await invalidateCache(`unreadCount:${sender}`);

//     return successResponse(res, result, 'Messages retrieved successfully', 200);
//   } catch (error) {
//     return errorResponse(res, 'Error retrieving messages', 500, error);
//   }
// };
// // Get messages between sender and receiver
// exports.getMessages = async (req, res) => {
//   try {
//     const { sender, receiver, limit = 20, cursor } = req.query;

//     if (!sender || !receiver) {
//       return errorResponse(res, 'Sender and receiver are required', 400);
//     }

//     const cacheKey = cursor 
//       ? `messages:${sender}:${receiver}:cursor:${cursor}:limit:${limit}`
//       : `messages:${sender}:${receiver}:recent:limit:${limit}`;

//     const result = await getOrSetCache(cacheKey, async () => {
//       // Base query condition
//       const queryCondition = {
//         $or: [
//           { sender, receiver },
//           { sender: receiver, receiver: sender },
//         ]
//       };

//       // Add cursor condition if provided
//       if (cursor) {
//         queryCondition.createdAt = { $lt: new Date(cursor) };
//       }

//       const messages = await Message.find(queryCondition)
//         .sort({ createdAt: -1 })
//         .limit(parseInt(limit))
//         .populate('sender', 'fullName profilePicture')
//         .populate('receiver', 'fullName profilePicture');

//       // Mark messages as read (only for recent messages)
//       if (!cursor) {
//         await Message.updateMany(
//           { sender: receiver, receiver: sender, isRead: false },
//           { isRead: true }
//         );
//       }

//       // Get the oldest timestamp for next cursor
//       const nextCursor = messages.length > 0 
//         ? messages[messages.length - 1].createdAt.toISOString() 
//         : null;

//       return {
//         messages: messages.reverse(), // chronological order
//         pagination: {
//           nextCursor,
//           hasMore: messages.length === parseInt(limit)
//         }
//       };
//     }, 180); // TTL 3 mins

//     // Emit read receipt
//     const io = getIo();
//     io.to(receiver.toString()).emit('messagesRead', { sender, receiver });
  
//     const senderStatus = getUserStatus(sender);
//     const receiverStatus = getUserStatus(receiver);

//     result.participants = {
//       [sender]: senderStatus,
//       [receiver]: receiverStatus
//     };
//     await invalidateCache(`unreadCount:${sender}`);

//     return successResponse(res, result, 'Messages retrieved successfully', 200);
//   } catch (error) {
//     return errorResponse(res, 'Error retrieving messages', 500, error);
//   }
// };

// new get mesage
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
    }).sort({ createdAt: 1 })
    .populate('sender', 'firstName lastName profilePicture')
    .populate('receiver', 'firstName lastName profilePicture');

    // Mark messages as read
    await Message.updateMany(
      { sender: receiver, receiver: sender, isRead: false },
      { isRead: true }
    );

    // Convert attachments to use CDN URLs
    const updatedMessages = messages.map(msg => {
      const updatedAttachments = msg.attachments?.map(att => ({
        ...att.toObject(),
        url: convertS3UrlToCDN(att.url)
      })) || [];

      return {
        ...msg.toObject(),
        attachments: updatedAttachments
      };
    });

    // Emit read receipt
    const io = getIo();
    io.to(receiver.toString()).emit('messagesRead', { sender, receiver });

    // Get participants' online status
    const senderStatus = getUserStatus(sender);
    const receiverStatus = getUserStatus(receiver);

    return successResponse(res, {
      messages: updatedMessages.reverse(),
      participants: {
        [sender]: senderStatus,
        [receiver]: receiverStatus
      }
    }, 'Messages retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, 'Error retrieving messages', 500, error);
  }
};
// Get all messages for a user
exports.getAllMessages = async (req, res) => {
  try {
    const userId = req.params.userId;
    const cacheKey = `messages:${userId}`;

    const messages = await getOrSetCache(cacheKey, async () => {
      return await Message.find({
        $or: [{ sender: userId }, { receiver: userId }],
      })
        .populate('sender', 'firstName lastName profilePicture')
        .populate('receiver', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 });
    }, 60); // Cache for 1 minute

    if (!messages || messages.length === 0) {
      return res.status(404).json({ message: 'No messages found' });
    }

    const unreadCount = messages.filter(
      (msg) =>
        msg.isRead === false &&
        msg.receiver &&
        msg.receiver._id.toString() === userId
    ).length;
  
    res.status(200).json({ messages, unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.params.userId;
    const cacheKey = `conversations:${userId}`;
    
    const conversations = await getOrSetCache(cacheKey, async () => {
      return await Conversation.find({
        participants: userId
      })
      .populate('participants', 'fullName profilePicture')
      .populate({
        path: 'lastMessage',
        select: 'text createdAt sender' // or other required fields
      })
      .sort({ updatedAt: -1 });
    }, 60); // Cache for 1 minute
    if (!conversations || conversations.length === 0) {
      return errorResponse(res, 'No conversations found', 404);
    }
    
    return successResponse(res, conversations, 'Conversations retrieved', 200);
  } catch (error) {
    return errorResponse(res, 'Error fetching conversations', 500, error);
  }
};
// Get messages by ID (either sender or receiver)
exports.getMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;
    // Find message by ID
    const message = await Message.findById(messageId)
      .populate('sender', 'firstName lastName profilePicture')
      .populate('receiver', 'firstName lastName profilePicture');
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching message', error });
  }
};

exports.deleteMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const message = await Message.findById(id);
    // Check if the message exists
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    // Verify message ownership
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
     // Delete image from S3 if exists
     if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.url) {
          const key = attachment.url.split('.com/')[1];
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
          }));
        }
      }
    }
    await message.deleteOne(); // Delete message from database
    const sender = message.sender.toString();
    const receiver = message.receiver.toString();
    // Notify other user about message deletion
    const io = getIo();
    io.to(message.receiver.toString()).emit('messageDeleted', { messageId: id });
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
};

// Update messages by senderId
exports.updateMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newMessage } = req.body;
    const userId = req.user._id;
    const newImage = req.file?.location;
    if (!newMessage) {
      return res.status(400).json({ message: 'New message content is required' });
    }
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You can only update your own messages' });
    }
    // Pehle existing message ko decrypt
    let decryptedOldMessage = decrypt(message.message);
    // Agar naye message me koi change hai to update 
    if (newMessage && newMessage !== decryptedOldMessage) {
      message.message = encrypt(newMessage);
    }
    // if new image , delete old images
    if (newImage) {
      if (message.attachments.length > 0) {
        for (const attachment of message.attachments) {
          if (attachment.url) {
            const key = attachment.url.split('.com/')[1]; // 🔹 Extracting S3 Key
            await s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key
            }));
          }
        }
      }
      // Update attachments with new image
      message.attachments = [{
        type: "image",
        url: newImage,
        name: req.file.originalname,
        size: req.file.size,
      }];
    }
    // Save updated message
    await message.save();
    // Response me decrypted message bhejna hai taaki UI me text dikhe
    res.status(200).json({ 
      message: 'Message updated successfully', 
      data: { ...message.toObject(), message: decrypt(message.message) } 
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ message: 'Error updating message', error });
  }
};

// Get unread messages count
exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await Message.countDocuments({
      'receiver._id': new mongoose.Types.ObjectId(userId),
      isRead: false
    });

    res.status(200).json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Error getting unread count', error });
  }
};

// Send image message
exports.sendImageMessage = async (req, res) => {
  try {
    const { sender, receiver } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);
    if (!senderUser || !receiverUser) {
      return res.status(400).json({ message: 'Sender or receiver not found' });
    }
    const newMessage = new Message({
      sender,
      receiver,
      message: 'Image',
      attachments: [{
        type: 'image',
        url: req.file.location,
        name: req.file.originalname,
        size: req.file.size
      }],
      createdAt: new Date(),
    });
    await newMessage.save();
    // Emit real-time message event
    const io = getIo();
    io.to(receiver.toString()).emit('newMessage', {
      message: newMessage,
      sender: {
        _id: senderUser._id,
        fullName: senderUser.fullName,
        profilePicture: senderUser.profilePicture
      }
    });
    res.status(201).json({ 
      message: 'Image sent successfully', 
      data: newMessage 
    });
  } catch (error) {
    console.error('Error sending image:', error);
    res.status(500).json({ 
      message: 'Error sending image', 
      error: error.message 
    });
  }
};