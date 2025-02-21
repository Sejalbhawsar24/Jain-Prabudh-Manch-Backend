const express = require("express");
const { createJainAadhar, getAllJainAadhar, getJainAadharById, updateJainAadharById, deleteJainAadharById } = require("../controller/jainAdharctrl");
const router = express.Router();

// Route for creating Jain Aadhar
router.post("/create", createJainAadhar);
router.get('/', getAllJainAadhar);
router.get('/:id', getJainAadharById);
router.put('/:id', updateJainAadharById);
router.delete(':id', deleteJainAadharById);

module.exports = router;
