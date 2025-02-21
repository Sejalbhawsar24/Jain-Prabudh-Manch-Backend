const express = require('express');
const {registerShanghatan, loginShanghatan, getAllUsers, getUserById } = require('../controller/ShanghatanIdPasswordController');

const router = express.Router();

router.post('/register', registerShanghatan);

router.post('/login', loginShanghatan);

router.get('/users', getAllUsers);

router.get('/users/:id', getUserById);

module.exports = router;
