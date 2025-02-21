const express = require('express');
const { createUser, getUserById, getAllUsers, loginUser, updateUserById } = require('../controller/jainAdharLoginController');
const router = express.Router();

router.post('/register', createUser);
router.post('/login', loginUser);
router.get('/:id', getUserById);
router.get('/', getAllUsers);
router.put('/:id', updateUserById);

module.exports = router;
