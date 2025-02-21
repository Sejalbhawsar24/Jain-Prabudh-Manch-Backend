const express = require('express');
const { createJainVyapar, getAllJainVyapar, getJainVyaparById, updateJainVyapar } = require('../controller/jainVyaparController');
const router = express.Router();

// Create a new entry
router.post('/', createJainVyapar);

// Get all entries
router.get('/', getAllJainVyapar);

// Get a single entry by ID
router.get('/:id', getJainVyaparById);

// Update an entry by ID
router.put('/:id', updateJainVyapar);

module.exports = router;
