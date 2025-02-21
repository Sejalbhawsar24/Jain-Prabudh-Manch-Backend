const express = require('express');
const { createSadhu } = require('../controller/sadhuController');

const router = express.Router();

// POST request to create Sadhu ID and Password
router.post('/create', createSadhu);

module.exports = router;
