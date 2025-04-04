const express = require('express');
const { 
  createReport, 
  getReportById, 
  getAllReports, 
  updateReport, 
  deleteReport,
  getSubmittedReports,
  getReceivedReports,
  updateReportStatus,
  getTopPerformers
} = require('../../controller/ReportingControllers/reportingController');
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const { validateRequest } = require('../../middlewares/validationMiddleware');
const { check } = require('express-validator');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation rules
const reportValidation = [
  check('sanghName').notEmpty().withMessage('Ikai name is required'),
  check('presidentName').notEmpty().withMessage('President name is required'),
  check('secretaryName').notEmpty().withMessage('Secretary name is required'),
  check('treasurerName').notEmpty().withMessage('Treasurer name is required'),
  check('reportMonth').isInt({ min: 1, max: 12 }).withMessage('Valid report month is required'),
  check('reportYear').isInt({ min: 2000 }).withMessage('Valid report year is required'),
  check('membershipCount').isInt({ min: 0 }).withMessage('Membership count must be a positive number'),
  check('jainAadharCount').isInt({ min: 0 }).withMessage('Jain Aadhar count must be a positive number'),
  
  // Validate general meetings
  check('generalMeetings.details.*.meetingNumber').optional().isInt({ min: 1 }).withMessage('General meeting number must be a positive number'),
  check('generalMeetings.details.*.date').optional().isISO8601().withMessage('General meeting date must be a valid date'),
  check('generalMeetings.details.*.attendanceCount').optional().isInt({ min: 0 }).withMessage('General meeting attendance count must be a positive number'),
  
  // Validate board meetings
  check('boardMeetings.details.*.meetingNumber').optional().isInt({ min: 1 }).withMessage('Board meeting number must be a positive number'),
  check('boardMeetings.details.*.date').optional().isISO8601().withMessage('Board meeting date must be a valid date'),
  check('boardMeetings.details.*.attendanceCount').optional().isInt({ min: 0 }).withMessage('Board meeting attendance count must be a positive number'),
  
  // Validate projects/events
  check('projects.*.eventName').optional().notEmpty().withMessage('Event name is required'),
  check('projects.*.memberCount').optional().isInt({ min: 0 }).withMessage('Event member count must be a positive number'),
  check('projects.*.eventDate').optional().isISO8601().withMessage('Event date must be a valid date'),
  
  // Validate visits (super simplified)
  check('visits.*.date').optional().isISO8601().withMessage('Visit date must be a valid date'),
  check('visits.*.visitorName').optional().notEmpty().withMessage('Visitor name is required'),
  check('visits.*.visitorLevel').optional().isIn(['national', 'state', 'district', 'city', 'area']).withMessage('Invalid visitor level'),
  check('visits.*.purpose').optional().notEmpty().withMessage('Visit purpose is required')
];

const statusValidation = [
  check('status').isIn(['submitted', 'reviewed', 'approved']).withMessage('Invalid status')
];

// POST: Create a new report
router.post('/', reportValidation, validateRequest, createReport);


// GET: Get reports received by a specific Sangh
router.get('/received', getReceivedReports);

// GET: Get reports submitted by a specific Sangh
router.get('/submitted/', getSubmittedReports);

// GET: Get top performing Sanghs
router.get('/top-performers', getTopPerformers);



// GET: Get all reports (with filtering)
router.get('/', getAllReports);
// GET: Get a single report by ID
router.get('/:id', getReportById);
// PUT: Update a report by ID
router.put('/:id', reportValidation, validateRequest, updateReport);

// PATCH: Update report status and feedback
router.patch('/:id/status', statusValidation, validateRequest, updateReportStatus);

// DELETE: Delete a report by ID
router.delete('/:id', deleteReport);




module.exports = router;
