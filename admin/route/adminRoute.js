const express = require('express');
const { adminUser, adminLogin } = require('../controller/adminController');
const router = express.Router();

router.post('/register',adminUser)
router.post('/login',adminLogin)

module.exports = router;
