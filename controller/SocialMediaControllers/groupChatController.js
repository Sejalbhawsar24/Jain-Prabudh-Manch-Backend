const {GroupChat, decrypt} = require('../../model/SocialMediaModels/groupChatModel');
const mongoose = require('mongoose');
const path = require('path');
const { getIo } = require('../../websocket/socket');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const JainAadhar = require('../../model/UserRegistrationModels/jainAadharModel')
const { convertS3UrlToCDN } = require('../../utils/s3Utils');

// 1. Create Group Chat
exports.createGroupChat = async (req, res) => {
  try {
    let { groupName, groupMembers, creator } = req.body;

    // Directly use uploaded image if available, else set it to undefined
    let groupImage = req.file ? req.file.location : undefined;

    console.log("Uploaded file:", groupImage);
    if (groupImage) {
      groupImage = convertS3UrlToCDN(groupImage);
    }
    if (!groupName) groupName = "New Group";

    if (!groupMembers || !Array.isArray(groupMembers) || groupMembers.length === 0) {
      return res.status(400).json({ message: "At least one group member is required." });
    }

    // Ensure creator is included in group members
    if (!groupMembers.includes(creator)) {
      groupMembers.push(creator);
    }

    const newGroup = new GroupChat({
      groupName,
      groupMembers: groupMembers.map(memberId => ({
        user: memberId,
        role: memberId === creator ? 'admin' : 'member'
      })),
      groupImage, // This can now be undefined if frontend doesn't send an image
      creator,
      admins: [creator]
    });

    await newGroup.save();

    // Prepare a simplified group object for socket emission
    const groupForSocket = {
      _id: newGroup._id,
      groupName: newGroup.groupName,
      groupImage: newGroup.groupImage,
      creator: newGroup.creator,
      createdAt: newGroup.createdAt
    };

    // Notify all group members via Socket.io
    const io = getIo();
    if (io) {
      console.log(`Notifying ${groupMembers.length} members about new group ${newGroup._id}`);
      groupMembers.forEach(memberId => {
        io.to(memberId.toString()).emit('newGroup', groupForSocket);
        console.log(`Emitted newGroup event to user ${memberId}`);
        io.to(memberId.toString()).emit('addedToGroup', {
          groupId: newGroup._id,
          groupName: newGroup.groupName
        });
      });
    } else {
      console.error('Socket.io instance not available');
    }

    return successResponse(res, newGroup, "Group created successfully", 201);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ message: "Group ID is required." });
    }

    const group = await GroupChat.findById(groupId)
      .populate("groupMembers.user", "firstName lastName profilePicture")
      .populate('creator', 'firstName lastName profilePicture')
      .populate('admins', 'firstName lastName profilePicture');

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // ✅ Convert groupImage URL to CDN if it exists
    if (group.groupImage) {
      group.groupImage = convertS3UrlToCDN(group.groupImage);
    }

    res.status(200).json({ group });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: error.message });
  }
};


//  Create or Find Gotra Group Automatically
exports.createOrFindGotraGroup = async (req, res) => {
  try {
    const { creator } = req.body;
    // Creator ka Gotra Jain Aadhar se fetch karein
    const creatorData = await JainAadhar.findOne({ userId: creator });
    if (!creatorData || !creatorData.gotra) {
      return res.status(400).json({ message: "Gotra not found for the creator" });
    }
    const gotra = creatorData.gotra.trim().toLowerCase();

    //  Gotra ke basis par saare Jain Aadhar users fetch karein
    const gotraUsers = await JainAadhar.find({ gotra: { $regex: new RegExp(`^${gotra}$`, 'i') } }).select("userId");
    if (gotraUsers.length === 0) {
      return res.status(400).json({ message: "No users found for this Gotra" });
    }
    const groupMembers = gotraUsers.map(user => user.userId.toString());

    // Check if group already exists
    let existingGroup = await GroupChat.findOne({ groupName: new RegExp(`^${gotra} Group$`, 'i') });

    let groupImage = req.file ? req.file.location : "https://jainprabhutmanch-bucket.s3.ap-south-1.amazonaws.com/groupchaticon/JainGorupChatDefaultImage.png";

    if (existingGroup) {
      // check existing group
      groupMembers.forEach(memberId => {
        if (!existingGroup.groupMembers.some(m => m.user.toString() === memberId)) {
          existingGroup.groupMembers.push({ user: memberId, role: "member" });
        }
      });
      if (req.file) {
        existingGroup.groupImage = groupImage;
      }
      await existingGroup.save();
    } else {
      // Gotra Group create
      existingGroup = new GroupChat({
        groupName: `${gotra.charAt(0).toUpperCase() + gotra.slice(1)} Group`, // Gotra Group name fix karein
        groupMembers: groupMembers.map(memberId => ({
          user: memberId,
          role: memberId === creator ? "admin" : "member"
        })),
        groupImage,
        isGotraGroup:true,
        creator,
        admins: [creator]
      });
      await existingGroup.save();
    }
    //  Notify all members via Socket.io
    const io = getIo();
    if (io) {
      groupMembers.forEach(memberId => {
        io.to(memberId.toString()).emit("newGroup", {
          _id: existingGroup._id,
          groupName: existingGroup.groupName,
          groupImage: existingGroup.groupImage,
          creator: existingGroup.creator,
          createdAt: existingGroup.createdAt
        });
        io.to(memberId.toString()).emit("addedToGroup", {
          groupId: existingGroup._id,
          groupName: existingGroup.groupName
        });
      });
    } else {
      console.error("Socket.io instance not available");
    }
    return res.status(201).json({
      success: true,
      message: "Gotra-based group created or updated successfully",
      group: existingGroup
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// all groups
exports.getAllGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await GroupChat.find({
      'groupMembers.user': userId,
      isGotraGroup: false
    })
    .populate('groupMembers.user', 'firstName lastName profilePicture')
    .populate('creator', 'firstName lastName profilePicture');

    // Convert groupImage URL to CDN if it exists in each group
    groups.forEach(group => {
      if (group.groupImage) {
        group.groupImage = convertS3UrlToCDN(group.groupImage);
      }
    });

    res.status(200).json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Fetch All Gotra Groups
exports.getUserGotraGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const gotraGroups = await GroupChat.find({ 
      isGotraGroup: true, 
      "groupMembers.user": userId
    })
    .populate("groupMembers.user", "firstName lastName profilePicture")
    .populate("creator", "firstName lastName profilePicture");
    res.status(200).json({ success: true, gotraGroups });
  } catch (error) {
    console.error("Error fetching user Gotra Groups:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//  Get All Group Chats
exports.getAllGroupChats = async (req, res) => {
  try {
    const groups = await GroupChat.find()
    .populate('groupMembers.user', 'firstName lastName profilePicture')    
    .populate('creator', 'firstName lastName profilePicture');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Send Group Message
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, sender, message } = req.body;
    const group = await GroupChat.findById(groupId)
    .populate('groupMembers.user', 'firstName lastName profilePicture');
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (!group) {
      // Delete uploaded file if group not found
      if (req.file) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      return errorResponse(res, "Group not found", 404);
    }

    // Check if sender is group member
    const isMember = group.groupMembers.some(
      member => member.user._id.toString() === sender.toString()
    );
    
    if (!isMember) {
      // Delete uploaded file if not a member
      if (req.file) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      return errorResponse(res, "Not a group member", 403);
    }

    const newMessage = {
      sender,
      message: message || 'Image',
      attachments: req.file ? [{
        type: 'image',
        url: convertS3UrlToCDN(req.file.location),
        name: req.file.originalname,
        size: req.file.size
      }] : [],
      createdAt: new Date()
    };
    group.groupMessages.push(newMessage);
    await group.save();
    // Get the last message (the one we just added)
    const sentMessage = group.groupMessages[group.groupMessages.length - 1];
    const plainSent = sentMessage.toObject();
    plainSent.message = decrypt(plainSent.message);
    const senderInfo = group.groupMembers.find(
      member => member.user._id.toString() === sender.toString()
    );
    // Prepare message data for socket emission
    const messageData = {
      groupId,
      message: {
        ...sentMessage.toObject(),
        sender: {
          _id: senderInfo.user._id,
          fullName: `${senderInfo.user.firstName} ${senderInfo.user.lastName}`,
          profilePicture: senderInfo.user.profilePicture
        }
      }
    };
    // Emit message to all group members
    const io = getIo();
    if (io) {
      console.log(`Emitting new group message to room group:${groupId}`);
      
      // Emit to the group room
      io.to(`group:${groupId}`).emit('newGroupMessage', messageData);
      
      // Also emit individually to ensure delivery
      group.groupMembers.forEach(member => {
        const memberId = member.user._id.toString();
        io.to(memberId).emit('newGroupMessage', messageData);
        console.log(`Emitted message to group member: ${memberId}`);
      });
    } else {
      console.error('Socket.io instance not available');
    }
    return successResponse(res, {
      ...plainSent,
      sender: {
        _id: senderInfo.user._id,
        fullName: `${senderInfo.user.firstName} ${senderInfo.user.lastName}`,
        profilePicture: senderInfo.user.profilePicture
      }
    }, "Message sent successfully", 200);
  } catch (error) {
    // Delete uploaded file if error occurs
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
    console.error('Send group message error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// 5. Get All Messages for a Group
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const skip = (page - 1) * limit;

    const group = await GroupChat.findById(groupId)
      .populate({
        path: 'groupMessages.sender',
        select: 'firstName lastName profilePicture'
      })
      .slice('groupMessages', [skip, parseInt(limit)]);

    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    const isMember = group.groupMembers.some(
      member => member.user.toString() === userId.toString()
    );

    if (!isMember) {
      return errorResponse(res, "Not authorized to view messages", 403);
    }

    const decryptedMessages = group.groupMessages.map(msg => {
      const plain = msg.toObject({ getters: true });

      // ✅ CDN URL conversion for each attachment
      if (plain.attachments && plain.attachments.length > 0) {
        plain.attachments = plain.attachments.map(att => ({
          ...att,
          url: convertS3UrlToCDN(att.url)
        }));
      }

      return plain;
    });

    return successResponse(res, {
      messages: decryptedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: group.groupMessages.length
      }
    }, "", 200);
  } catch (error) {
    console.error('Get group messages error:', error);
    return errorResponse(res, error.message, 500);
  }
};



// 5. Delete Group Message
exports.deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user._id;
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
   // Find the message
   const messageIndex = group.groupMessages.findIndex(
    msg => msg._id.toString() === messageId
  );
  if (messageIndex === -1) {
    return errorResponse(res, "Message not found", 404);
  }
  const message = group.groupMessages[messageIndex];
    // Check if user is admin or message sender
    const isAdmin = group.admins.includes(userId);
    const isSender = message.sender.toString() === userId.toString();
    if (!isAdmin && !isSender) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }
  // Delete attachments if any
  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      if (attachment.url) {
        try {
          // Extract key using URL parsing for more reliability
          const url = new URL(attachment.url);
          const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
          console.log(`Attempting to delete attachment from S3: ${key}`);
          if (!key) {
            console.error('Failed to extract S3 key from URL:', attachment.url);
            continue;
          }
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key
        }));
        console.log(`Successfully deleted attachment from S3: ${key}`);
        } catch (error) {
          console.error('Error deleting attachment:', error.message);
          console.error('Attachment URL:', attachment.url);
        }
      }
    }
  }
     // Remove the message
     group.groupMessages.pull({ _id: messageId });
     await group.save();
     // Notify group members about message deletion
     const io = getIo();
     group.groupMembers.forEach(member => {
       io.to(member.user.toString()).emit('groupMessageDeleted', {
         groupId,
         messageId
       });
     });
     return successResponse(res, "", "Message deleted successfully", 200);
    } catch (error) {
      console.error('Delete group message error:', error);
      return errorResponse(res, error.message, 500);
    }
  };

// 6. Update Group Message
exports.updateGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName } = req.body;
    const userId = req.user._id;
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return res.status(403).json({ message: "Only admins can update group details" });
    }
    if (groupName) group.groupName = groupName;
    if (req.file) {
      group.groupImage = req.file.location;
    }
    await group.save();
  // Notify group members about update
  const io = getIo();
  group.groupMembers.forEach(member => {
    io.to(member.user.toString()).emit('groupUpdated', {
      groupId,
      groupName: group.groupName,
      groupImage: group.groupImage,
      description: group.description
    });
  });
    res.status(200).json({ message: 'Message updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update Group Details (Name, Image, Members)
exports.updateGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName } = req.body;
    const userId = req.user._id;

    // Fetch group details
    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is an admin
    if (!group.admins.includes(userId)) {
      return errorResponse(res, "Only admins can update group details", 403);
    }

    // ✅ Group Name Update
    if (groupName) {
      group.groupName = groupName;
    }

    // ✅ Handle Group Image Update
    if (req.file) {
      // Delete Old Image from AWS S3
      if (group.groupImage) {
        const oldKey = group.groupImage.split('.com/')[1]; // Extract key from URL
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldKey
          }));
        } catch (deleteError) {
          console.error('Error deleting old icon:', deleteError);
          // Continue with update even if delete fails
        }
      }
      // ✅ Save New Image
      group.groupImage = convertS3UrlToCDN(req.file.location);
    }
    await group.save();
    // Notify group members about the update
    const io = getIo();
    group.groupMembers.forEach(member => {
      io.to(member.user.toString()).emit('groupUpdated', {
        groupId,
        groupName: group.groupName,
        groupImage: group.groupImage,
      });
    });
    console.log("Group updated successfully:", group);
    res.status(200).json({ message: "Group details updated successfully", group });
  } catch (error) {
    console.error("Error updating group details:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add typing indicator for groups
exports.handleGroupTyping = async (socket, groupId) => {
  try {
    const group = await GroupChat.findById(groupId);
    if (!group) return;

    group.groupMembers.forEach(member => {
      if (member.user.toString() !== socket.userId.toString()) {
        socket.to(member.user.toString()).emit('userTypingInGroup', {
          userId: socket.userId,
          groupId
        });
      }
    });
  } catch (error) {
    console.error('Error handling group typing:', error);
  }
};

// Leave group
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const group = await GroupChat.findById(groupId);
    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }
    // Check f user is in group
    const isMember = group.groupMembers.some(
      member => member.user.toString() === userId.toString()
    );

    if (!isMember) {
      return errorResponse(res, "You are not a member of this group", 400);
    }

    // Check admin status
    const isAdmin = group.admins.includes(userId);
    if (isAdmin) {
      // If there are other admins, allow leaving
      const otherAdmins = group.admins.filter(adminId => 
        adminId.toString() !== userId.toString()
      );

      if (otherAdmins.length === 0) {
        // If no other admins, make the longest-standing member an admin
        const oldestMember = group.groupMembers
          .filter(member => member.user.toString() !== userId.toString())
          .sort((a, b) => a.joinedAt - b.joinedAt)[0];

        if (oldestMember) {
          group.admins.push(oldestMember.user);
          const memberIndex = group.groupMembers.findIndex(
            m => m.user.toString() === oldestMember.user.toString()
          );
          if (memberIndex !== -1) {
            group.groupMembers[memberIndex].role = 'admin';
          }
        }
      }
    }

    // Remove user from group
    group.groupMembers = group.groupMembers.filter(
      member => member.user.toString() !== userId.toString()
    );
    group.admins = group.admins.filter(
      adminId => adminId.toString() !== userId.toString()
    );

    if (group.groupMembers.length === 0) {
      await group.deleteOne();
      return successResponse(res, "", "Group deleted as no members remain", 200);
    }

    await group.save();

    // Notify other members
    const io = getIo();
    group.groupMembers.forEach(member => {
      io.to(member.user.toString()).emit('groupMemberLeft', {
        groupId,
        userId,
        remainingMembers: group.groupMembers.length
      });
    });

    return successResponse(res, "", "Successfully left the group", 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update group icon
exports.updateGroupIcon = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    if (!req.file) {
      return errorResponse(res, "No image file provided", 400);
    }

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return errorResponse(res, "Only admins can update group icon", 403);
    }

    // Delete old icon if exists
    if (group.groupImage) {
      const oldKey = group.groupImage.split('.com/')[1]; // Extract key from URL
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: oldKey
        }));
      } catch (deleteError) {
        console.error('Error deleting old icon:', deleteError);
        // Continue with update even if delete fails
      }
    }

    // Update with new icon
    group.groupImage = req.file.location;
    await group.save();

    // Notify members
    const io = getIo();
    group.groupMembers.forEach(member => {
      io.to(member.user.toString()).emit('groupIconUpdated', {
        groupId,
        newIcon: group.groupImage
      });
    });

    return successResponse(res, { groupImage: group.groupImage }, "Group icon updated successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Check group membership
exports.checkMembership = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    const isMember = group.groupMembers.some(
      member => member.user.toString() === userId.toString()
    );
    const isAdmin = group.admins.includes(userId);

    return successResponse(res, {
      isMember,
      isAdmin,
      memberCount: group.groupMembers.length
    }, "", 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Add members to group
exports.addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return errorResponse(res, "Only admins can add members", 403);
    }

    // Filter out existing members
    const newMembers = members.filter(memberId => 
      !group.groupMembers.some(m => m.user.toString() === memberId)
    );

    // Add new members
    group.groupMembers.push(...newMembers.map(memberId => ({
      user: memberId,
      role: 'member'
    })));

    await group.save();

    // Notify new members
    const io = getIo();
    newMembers.forEach(memberId => {
      io.to(memberId.toString()).emit('addedToGroup', {
        groupId: group._id,
        groupName: group.groupName
      });
    });

    return successResponse(res, { addedMembers: newMembers }, "Members added successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update group name
exports.updateGroupName = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { groupName } = req.body;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    // Check if user is admin
    if (!group.admins.includes(userId)) {
      return errorResponse(res, "Only admins can update group name", 403);
    }

    group.groupName = groupName;
    await group.save();

    // Notify members
    const io = getIo();
    group.groupMembers.forEach(member => {
      io.to(member.user.toString()).emit('groupUpdated', {
        groupId: group._id,
        groupName: group.groupName
      });
    });

    return successResponse(res, { groupName: group.groupName }, "Group name updated successfully", 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
