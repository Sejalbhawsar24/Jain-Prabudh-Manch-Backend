const express = require('express');
const router = express.Router();
const { createUnit, getUnitById, getAllUnits, updateUnit } = require('../controller/unitController');

// Create a new unit
router.post('/create', createUnit);

// Get a unit by ID
router.get('/:id', getUnitById);

// Get all units
router.get('/', getAllUnits);

// Update a unit by ID
router.put('/:id', updateUnit);

module.exports = router;
