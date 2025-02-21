const GroupChat = require('../model/groupChatModel');
const mongoose = require('mongoose');
const path = require('path');

// 1. Create Group Chat
exports.createGroupChat = async (req, res) => {
  try {
    let { groupName, groupMembers } = req.body;
    let groupImage = "";
    if (!groupName) groupName = "Jain Prabudh Manch";
    if (!groupMembers || !Array.isArray(groupMembers) || groupMembers.length === 0) {
      return res.status(400).json({ message: "At least one group member is required." });
    }
    const newGroup = new GroupChat({
      groupName,
      groupMembers,
      groupImage,
      groupMessages: [],
    });
    await newGroup.save();
    res.status(201).json({ message: "Group created successfully", group: newGroup });
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
      .populate("groupMembers", "firstName lastName profilePicture")
      .populate("groupMessages.sender", "firstName lastName profilePicture");
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }
    res.status(200).json({ group });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: error.message });
  }
};
// all groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await GroupChat.find();
    res.status(200).json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Get All Group Chats
exports.getAllGroupChats = async (req, res) => {
  try {
    const groups = await GroupChat.find().populate("groupMembers");
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Send Group Message
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, sender, message } = req.body;
    if (!message) return res.status(400).json({ message: "Message cannot be empty." });
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    group.groupMessages.push({ sender, message });
    await group.save();
    res.status(200).json({ message: "Message sent successfully", group });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Get All Messages for a Group
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log("Fetching messages for Group ID:", groupId);
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "Invalid groupId format" });
    }
    const group = await GroupChat.findById(groupId).populate("groupMessages.sender");
    if (!group) return res.status(404).json({ message: "Group not found" });

    res.status(200).json(group.groupMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: error.message });
  }
};

// 5. Delete Group Message
exports.deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    group.groupMessages = group.groupMessages.filter(msg => msg._id.toString() !== messageId);
    await group.save();

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Update Group Message
exports.updateGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const { newMessage } = req.body;
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const message = group.groupMessages.id(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    message.message = newMessage;
    await group.save();
    res.status(200).json({ message: 'Message updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// ✅ Update Group Details (Name, Image, Members)
exports.updateGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log("Received groupId:", groupId);
    console.log("Received body:", req.body);
    console.log("Received file:", req.file);
    const group = await GroupChat.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (req.body.groupName) group.groupName = req.body.groupName;
    if (req.file) {
      group.groupImage = `uploads/${req.file.filename}`;
    }
    await group.save();
    console.log("Group updated successfully:", group);
    res.status(200).json({ message: "Group details updated successfully", group });
  } catch (error) {
    console.error("Error updating group details:", error);
    res.status(500).json({ error: error.message });
  }
};

