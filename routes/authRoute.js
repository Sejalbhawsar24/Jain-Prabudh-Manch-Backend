const express = require('express');
const { registerUser, getAllUsers, getUserById, updateUserById, loginUser, updatePrivacy } = require('../controller/userCtrl');
const router = express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser)
router.get('/',getAllUsers);
router.get('/:id',getUserById);
router.put('/:id',updateUserById);
router.put('/update-privacy/:id', updatePrivacy);

module.exports = router;