const express = require('express');
const router = express.Router();
const suggestionComplaintController = require('../../controller/SuggestionControllerControllers/suggestionComplaintController');
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const { body, param, query } = require('express-validator');

// Apply authentication to all routes
router.use(authMiddleware);

// Create suggestion/complaint with validation
router.post('/', 
  [
    body('type').isIn(['suggestion', 'complaint']).withMessage('Type must be either suggestion or complaint'),
    body('subject').notEmpty().withMessage('Subject is required')
      .isLength({ min: 5, max: 100 }).withMessage('Subject must be between 5 and 100 characters'),
    body('description').notEmpty().withMessage('Description is required')
      .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
    body('recipient.type').isIn(['superadmin', 'sangh', 'user']).withMessage('Invalid recipient type'),
    body('recipient.sanghLevel').if(body('recipient.type').equals('sangh'))
      .isIn(['national', 'state', 'district', 'city', 'area']).withMessage('Invalid Sangh level'),
    body('recipient.sanghId').if(body('recipient.type').equals('sangh'))
      .isMongoId().withMessage('Invalid Sangh ID'),
    body('recipient.userId').if(body('recipient.type').equals('user'))
      .isMongoId().withMessage('Invalid User ID'),
  ],
  suggestionComplaintController.createSuggestionComplaint
);
router.get('/all',
  [
    query('type').optional().isIn(['suggestion', 'complaint']).withMessage('Type must be either suggestion or complaint'),
    query('status').optional().isIn(['pending', 'in-review', 'resolved']).withMessage('Invalid status'),
    query('view').optional().isIn(['sent', 'received']).withMessage('View must be either sent or received'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  suggestionComplaintController.getAllSuggestionsComplaint
);

// Get all suggestions/complaints with filtering
router.get('/',
  [
    query('type').optional().isIn(['suggestion', 'complaint']).withMessage('Type must be either suggestion or complaint'),
    query('status').optional().isIn(['pending', 'in-review', 'resolved']).withMessage('Invalid status'),
    query('view').optional().isIn(['sent', 'received']).withMessage('View must be either sent or received'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  suggestionComplaintController.getAllSuggestionsComplaints
);

// Get a single suggestion/complaint by ID
router.get('/:id', 
  [
    param('id').isMongoId().withMessage('Invalid ID format'),

  ],
  suggestionComplaintController.getSuggestionComplaintById
);

// Update suggestion/complaint status and response
router.patch('/:id', 
  [
    param('id').isMongoId().withMessage('Invalid ID format'),
    body('status').optional().isIn(['pending', 'in-review', 'resolved']).withMessage('Invalid status'),
    body('response').optional().isString().withMessage('Response must be a string')
      .isLength({ max: 1000 }).withMessage('Response cannot exceed 1000 characters'),
  ],
  suggestionComplaintController.updateSuggestionComplaint
);

// Delete suggestion/complaint
router.delete('/:id', 
  [
    param('id').isMongoId().withMessage('Invalid ID format'),
  ],
  suggestionComplaintController.deleteSuggestionComplaint
);

module.exports = router;
