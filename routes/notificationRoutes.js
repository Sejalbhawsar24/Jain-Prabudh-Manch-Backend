const express = require('express');
const { sendNotification, getNotifications, markAsRead } = require('../controller/notificationController');
const router = express.Router();

router.post('/send', sendNotification);
router.get('/user/:userId', getNotifications);
router.put('/read/:notificationId', markAsRead);

module.exports = router;
