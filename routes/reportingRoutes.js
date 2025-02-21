const express = require('express');
const { createReport, getReportById, getAllReports, updateReport, deleteReport } = require('../controller/reportingController');
const router = express.Router();

// POST: Create a new report
router.post('/',createReport);

// GET: Get a single report by ID
router.get('/:id', getReportById);

// GET: Get all reports
router.get('/', getAllReports);

// PUT: Update a report by ID
router.put('/:id', updateReport);

// DELETE: Delete a report by ID
router.delete('/:id', deleteReport);

module.exports = router;
