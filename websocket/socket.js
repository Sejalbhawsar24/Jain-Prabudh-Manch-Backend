const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const userSockets = new Map();
const userStatus = new Map(); 
const messageQueue = new Map();

const initializeWebSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    pingTimeout: 60000, // Close connection after 60s of inactivity
    pingInterval: 25000, // Send a ping every 25s
  });

  io.use((socket, next) => {
    try {
      // Authenticate WebSocket connection using JWT
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded._id;
      
      // Store user's online status in memory
      userStatus.set(socket.userId, {
        status: 'online',
        lastSeen: Date.now()
      });
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);

    // Store socket mapping
    userSockets.set(socket.userId, socket.id);

    // Join personal room
    socket.join(socket.userId.toString());

    // Update and broadcast user's online status
    updateUserStatus(socket.userId, 'online');

    // Handle joining group chats
    socket.on('joinGroup', (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${socket.userId} joined group ${groupId}`);
    });

    // Handle typing events
    socket.on('typing', ({ chatId, receiverId }) => {
      if (chatId) {
        socket.to(`group:${chatId}`).emit('userTyping', {
          userId: socket.userId,
          chatId
        });
      } else if (receiverId) {
        socket.to(receiverId.toString()).emit('userTyping', {
          userId: socket.userId
        });
      }
    });

    // Handle read receipts
    socket.on('messageRead', (data) => {
      const { messageId, senderId } = data;
      socket.to(senderId.toString()).emit('messageReadReceipt', {
        messageId,
        readBy: socket.userId
      });
    });

    // Add message delivery status
    socket.on('messageDelivered', (data) => {
      const { messageId, senderId } = data;
      socket.to(senderId.toString()).emit('messageDeliveryStatus', {
        messageId,
        status: 'delivered',
        deliveredAt: new Date()
      });
    });

    // Handle group typing
    socket.on('typingInGroup', ({ groupId }) => {
      const groupChatController = require('../controllers/SocialMediaControllers/groupChatController');
      groupChatController.handleGroupTyping(socket, groupId);
    });

    // Handle group message read status
    socket.on('groupMessageRead', ({ groupId, messageId }) => {
      socket.to(`group:${groupId}`).emit('groupMessageReadStatus', {
        messageId,
        readBy: socket.userId,
        readAt: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // When user connects, send queued messages
    if (messageQueue.has(socket.userId)) {
      const messages = messageQueue.get(socket.userId);
      messages.forEach(msg => {
        socket.emit('newMessage', msg);
      });
      messageQueue.delete(socket.userId);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      userSockets.delete(socket.userId);
      
      // Update user's last seen time and status
      updateUserStatus(socket.userId, 'offline');
      
      console.log('User disconnected:', socket.userId);
    });
  });

  // Add reconnection logic
  io.on('reconnect_attempt', () => {
    console.log('Attempting to reconnect...');
  });

  return io;
};

// Helper Functions
const getUserStatus = (userId) => {
  if (!userStatus.has(userId)) {
    return { status: 'offline', lastSeen: null };
  }
  return userStatus.get(userId);
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const addToMessageQueue = (userId, message) => {
  if (!messageQueue.has(userId)) {
    messageQueue.set(userId, []);
  }
  messageQueue.get(userId).push(message);
};

const updateUserStatus = (userId, status) => {
  userStatus.set(userId, {
    status,
    lastSeen: status === 'offline' ? Date.now() : null
  });
  
  if (io) {
    io.emit('userStatusUpdate', {
      userId,
      status,
      lastSeen: status === 'offline' ? Date.now() : null
    });
  }
};

module.exports = {
  initializeWebSocket,
  getIo,
  getUserStatus,
  getUserSocket: (userId) => userSockets.get(userId),
  addToMessageQueue,
  updateUserStatus
};