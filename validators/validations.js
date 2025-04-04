const { body, param, query, check } = require('express-validator');

// Jain Aadhar Validation
const jainAadharValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('pitaOrpatiName').notEmpty().trim().withMessage('Father/Husband name is required'),
 // body('gender').isIn(['Male', 'Female']).withMessage('Invalid gender'),
 // body('dob').notEmpty().withMessage('Date of birth is required'),
 // body('contactDetails.email').isEmail().withMessage('Invalid email address'),
 // body('contactDetails.number').matches(/^\d{10}$/).withMessage('Invalid phone number'),
];

// User Registration Validation
const userValidation = {
  register: [
    body('firstName').notEmpty().trim().escape()
      .isLength({ min: 2, max: 30 }).withMessage('First name must be between 2 and 30 characters'),
    body('lastName').notEmpty().trim().escape()
      .isLength({ min: 2, max: 30 }).withMessage('Last name must be between 2 and 30 characters'),
    //body('phoneNumber').matches(/^\d{10}$/).withMessage('Phone number must be 10 digits'),
    // body('password')
    //   .isLength({ min: 8 })
    //   .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
    //   .withMessage('Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character'),
    //body('birthDate').isISO8601().withMessage('Invalid date format'),
    body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender value'),
    body('city').notEmpty().trim().escape(),
  ],
  login: [
    check('fullName')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces')
      .isLength({ min: 4, max: 50 })
      .withMessage('Full name must be between 4 and 50 characters'),
    check('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

// Post Validation
const postValidation = {
  create: [
    body('caption').optional().isString().isLength({ max: 500 }).withMessage('Caption must be a string with a maximum length of 500 characters'),
    body('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  ],
  edit: [
    param('postId').notEmpty().isMongoId().withMessage('Post ID is required and must be a valid Mongo ID'),
    body('caption').optional().isString().isLength({ max: 500 }).withMessage('Caption must be a string with a maximum length of 500 characters'),
    body('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  ],
  comment: [
    body('postId').notEmpty().isMongoId().withMessage('Post ID is required and must be a valid Mongo ID'),
    body('commentText').notEmpty().isString().withMessage('Comment text is required and must be a string'),
    body('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  ],
  reply: [
    body('commentId').notEmpty().isMongoId().withMessage('Comment ID is required and must be a valid Mongo ID'),
    body('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
    body('replyText').notEmpty().isString().withMessage('Reply text is required and must be a string'),
  ],
  toggleLike: [
    param('postId').notEmpty().isMongoId().withMessage('Post ID is required and must be a valid Mongo ID'),
    query('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  ],
  delete: [
    param('postId').notEmpty().isMongoId().withMessage('Post ID is required and must be a valid Mongo ID'),
    body('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  ],
  getPostsByUser: [
    param('userId').notEmpty().isMongoId().withMessage('User ID is required and must be a valid Mongo ID'),
  ],
  getPostById: [
    param('postId').notEmpty().isMongoId().withMessage('Post ID is required and must be a valid Mongo ID'),
  ],
  getReplies: [
    param('commentId').notEmpty().isMongoId().withMessage('Comment ID is required and must be a valid Mongo ID'),
  ],
};

module.exports = {
  jainAadharValidation,
  userValidation,
  postValidation
};