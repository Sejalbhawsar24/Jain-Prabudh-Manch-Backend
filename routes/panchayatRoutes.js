const express = require('express');
const { createPanchayat, getAllPanchayats, getPanchayatById, updatePanchayat } = require('../controller/panchayatController');
const router = express.Router();

// Routes
router.post('/', createPanchayat); // Create Panchayat
router.get('/all', getAllPanchayats); // Get all Panchayats
router.get('/:userId/:panchayatId', getPanchayatById); // Get Panchayat by ID
router.put('/:id', updatePanchayat); // Update Panchayat by ID

module.exports = router;
