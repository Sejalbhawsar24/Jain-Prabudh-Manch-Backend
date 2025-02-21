const express = require('express');
const router = express.Router();
const groupChatController = require('../controller/groupChatController');
const upload = require('../middlewares/upload');

// Create a new group chat
router.post('/create', groupChatController.createGroupChat);
router.get("/:groupId", groupChatController.getGroupDetails);
router.get('/',groupChatController.getAllGroups);
// Get all group chats
router.get('/all', groupChatController.getAllGroupChats);
// Send Group Message
router.post("/send-message", groupChatController.sendGroupMessage);
// Get All Messages for a Group
router.get("/:groupId/messages", groupChatController.getGroupMessages);
// Delete Group Message
router.delete("/:groupId/messages/:messageId", groupChatController.deleteGroupMessage);
// Update Group Message
router.put("/:groupId/messages/:messageId", groupChatController.updateGroupMessage);
// Update Group Details (Name, Image, Members)
router.put("/:groupId", upload.single('groupImage') ,groupChatController.updateGroupDetails);


module.exports = router;
