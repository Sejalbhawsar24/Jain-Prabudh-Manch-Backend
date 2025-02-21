const express = require('express');
const { createTirthSanrakshan, getAllTirthSanrakshan, getTirthSanrakshanById } = require('../controller/TirthSanrakshanController');
const router = express.Router();

router.post('/', createTirthSanrakshan);
router.get('/all', getAllTirthSanrakshan);
router.get('/:id', getTirthSanrakshanById);

module.exports = router;
