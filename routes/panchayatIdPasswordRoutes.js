const express = require('express');
const {register, login } = require('../controller/panchayatIdPasswordController');
const router = express.Router();

// Register Route
router.post('/register', register);

// Login Route
router.post('/login', login);
//router.get('/', panchayatIdPasswordController.getAllPanchayatIdPasswords);

// router.get('/:id', panchayatIdPasswordController.getPanchayatIdPasswordById);

// router.put('/:id', panchayatIdPasswordController.updatePanchayatIdPassword);

// router.delete('/:id', panchayatIdPasswordController.deletePanchayatIdPassword);

module.exports = router;
