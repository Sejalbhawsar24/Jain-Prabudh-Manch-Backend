const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption configuration
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
const IV_LENGTH = 16; // For AES, this is always 16

// Encryption/Decryption functions
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails, return the original text (for handling legacy messages)
    return text;
  }
}

const groupMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  message: {
    type: String,
    trim: true,
    set: function(value) {
      // Encrypt message before saving
      return value ? encrypt(value) : 'Image';
    },
    get: function(value) {
      // Decrypt message when accessing
      return value ? decrypt(value) : '';
    }
  },
   // Media attachments (only images)
   attachments: [{
    type: {
      type: String,
      enum: ['image'],
    },
    url: {
      type: String,
      required: true
    },
    name: String,
    size: Number
  }],
  // Message status
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // For deleted messages
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  // For reply feature
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const groupChatSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
  },
  gotraGroupName: { type: String, default: null },
  groupImage:{
    type:String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  description: {
    type: String,
    trim: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groupMembers: [{
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
  }],
  groupMessages: [groupMessageSchema],
  // Group settings
  settings: {
    onlyAdminsCanSend: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanAddMembers: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanEditInfo: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isGotraGroup: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Indexes for better query performance
groupChatSchema.index({ 'groupMembers.user': 1 });
groupChatSchema.index({ creator: 1 });
groupChatSchema.index({ admins: 1 });
// Add compound indexes for common query patterns
groupChatSchema.index({ 'groupMembers.user': 1, isActive: 1 }); // For finding active groups a user belongs to
groupChatSchema.index({ isActive: 1, createdAt: -1 }); // For listing active groups by creation date
groupChatSchema.index({ 'settings.onlyAdminsCanSend': 1, isActive: 1 }); // For filtering groups by permission settings
groupChatSchema.index({ gotraGroupName: 1, isActive: 1 });
// Methods for group management
groupChatSchema.methods.addMember = async function(userId) {
  if (!this.groupMembers.some(member => member.user.toString() === userId.toString())) {
    this.groupMembers.push({ user: userId });
    await this.save();
  }
};

groupChatSchema.methods.removeMember = async function(userId) {
  this.groupMembers = this.groupMembers.filter(
    member => member.user.toString() !== userId.toString()
  );
  await this.save();
};

groupChatSchema.methods.makeAdmin = async function(userId) {
  const member = this.groupMembers.find(
    member => member.user.toString() === userId.toString()
  );
  if (member) {
    member.role = 'admin';
    if (!this.admins.includes(userId)) {
      this.admins.push(userId);
    }
    await this.save();
  }
};

groupChatSchema.methods.muteMember = async function(userId, duration) {
  const member = this.groupMembers.find(
    member => member.user.toString() === userId.toString()
  );
  if (member) {
    member.isMuted = true;
    member.mutedUntil = new Date(Date.now() + duration);
    await this.save();
  }
};

// Add method to delete message attachments
groupMessageSchema.methods.deleteAttachments = async function() {
  if (this.attachments && this.attachments.length > 0) {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    const { s3Client } = require('../config/s3Config');

    for (const attachment of this.attachments) {
      if (attachment.url) {
        try {
          const oldKey = attachment.url.split('.com/')[1];
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldKey
          }));
        } catch (error) {
          console.error('Error deleting group message attachment:', error);
        }
      }
    }
  }
};

// ✅ **Export `decrypt` function**
module.exports = {
  GroupChat: mongoose.model('GroupChat', groupChatSchema),
  decrypt
};