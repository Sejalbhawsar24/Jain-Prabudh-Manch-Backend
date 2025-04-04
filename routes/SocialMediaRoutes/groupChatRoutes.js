const express = require('express');
const router = express.Router();
const upload = require('../../middlewares/upload');
const {createGroupChat, getGroupDetails, getAllGroups, getAllGroupChats, sendGroupMessage, getGroupMessages, deleteGroupMessage, updateGroupDetails, updateGroupMessage, leaveGroup, updateGroupIcon, checkMembership, addMembers, updateGroupName, createOrFindGotraGroup, getAllGotraGroups, getUserGotraGroups } = require('../../controller/SocialMediaControllers/groupChatController');
const {authenticate} = require('../../middlewares/authMiddlewares')
// Apply authentication to all routes
router.use(authenticate);

router.post('/create', upload.single('groupImage'), createGroupChat);
router.post('/create-gotra-group', upload.single('groupImage'), createOrFindGotraGroup);

// Get all groups for a user
router.get('/user-groups', getAllGroups);
router.get('/gotra-groups', getUserGotraGroups);

// Get group details
router.get('/:groupId', getGroupDetails);
// Get all group chats
router.get('/all-chats', getAllGroupChats);
// Send Group Message
router.post('/send-message', upload.single('chatImage'), sendGroupMessage);
// Get All Messages for a Group
router.get('/messages/:groupId', getGroupMessages);
// Delete Group Message
router.delete('/messages/:groupId/:messageId', deleteGroupMessage);
// Update Group Details (Name, Image, Members)
router.put('/update/:groupId', upload.single('groupImage'), updateGroupDetails);
// Leave group
router.post('/leave/:groupId', leaveGroup);
// Update group icon
router.post('/icon/:groupId', upload.single('groupIcon'), updateGroupIcon);
// Check group membership
router.get('/check-membership/:groupId', checkMembership);
// Add members to group
router.post('/add-members/:groupId', addMembers);
// Update group name
router.put('/update-name/:groupId', updateGroupName);
// Update Group Message
router.put('/messages/:groupId/:messageId', updateGroupMessage);

module.exports = router;
