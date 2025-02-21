const express = require('express');
const { createBiodata, updateBiodata, getBiodata, getAllBiodatas } = require('../controller/vyavahikBiodataController');
const router = express.Router();

// Create a new biodata
router.post('/', createBiodata);

// Update a biodata by ID
router.put('/:id', updateBiodata);

// Get a single biodata by ID
router.get('/:id', getBiodata);

// Get all biodatas
router.get('/', getAllBiodatas);

module.exports = router;
