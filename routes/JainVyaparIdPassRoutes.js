const express = require('express');
const { createJainIdPass } = require('../controller/JainVyaparIdPassController');
const router = express.Router();

// Create Jain Vyapar ID and Password
router.post('/create', createJainIdPass);

// router.get('/', JainVyaparController.getAllJainVyapars);

// router.get('/:id', JainVyaparController.getJainVyaparById);

// router.delete('/:id', JainVyaparController.deleteJainVyapar);

module.exports = router;
