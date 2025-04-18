const express = require('express');
const { createInquiry } = require('../../controller/SanghControllers/inquiryController');
const router = express.Router();

router.post('/', createInquiry);

module.exports = router;
