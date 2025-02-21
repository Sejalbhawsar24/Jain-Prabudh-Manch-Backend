const express = require('express');
const { createStory, getAllStories, getStoriesByUser, deleteStory } = require('../controller/storyController');
const upload = require('../middlewares/upload');
const router = express.Router();

router.post("/", upload.array("media"), createStory); // ✅ Multiple file upload
router.get('/get', getAllStories); 
router.get('/:userId', getStoriesByUser);
router.delete('/delete/:userId/:storyId', deleteStory);

module.exports = router;
