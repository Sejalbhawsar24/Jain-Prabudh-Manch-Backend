
const express = require('express');
const { 
    registerUser, 
    getAllUsers, 
    getUserById, 
    updateUserById, 
    loginUser, 
    updatePrivacy,
    uploadProfilePicture,
    skipProfilePicture,
    logoutUser,
    searchUsers,
    verifyEmail,
    resendVerificationCode,
    requestPasswordReset,
    resetPassword
} = require('../../controller/UserRegistrationControllers/userController');
const { authMiddleware, checkAccess } = require('../../middlewares/authMiddlewares');
const upload = require('../../middlewares/upload');
const { check, param, body } = require('express-validator');
const rateLimit = require('express-rate-limit');


const router = express.Router();


// Rate limiters
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: {
        success: false,
        message: 'Too many login attempts. Please try again later.'
    }
});

// const registerLimiter = rateLimit({
//     windowMs: 60 * 60 * 1000, // 1 hour
//     max: 3, // 3 registration attempts per hour
//     message: {
//         success: false,
//         message: 'Too many registration attempts. Please try again later.'
//     }
// });

// Auth routes
router.post('/register',
    [
        body('firstName').trim().isLength({ min: 2, max: 30 }).withMessage('First name must be between 2 and 30 characters'),
        body('lastName').trim().isLength({ min: 2, max: 30 }).withMessage('Last name must be between 2 and 30 characters'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
    ],
    registerUser
);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendVerificationCode);

// Password reset
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/login',loginUser);
router.use(authMiddleware);
router.post('/logout', logoutUser);
router.use(checkAccess);
router.get('/', getAllUsers);
// Search users endpoint for suggestion/complaint recipient selection
router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUserById);
router.put('/update-privacy/:id', updatePrivacy);
router.post('/upload-profile-picture', authMiddleware,
 upload.single('profilePicture'),uploadProfilePicture);
router.post('/skip-profile-picture', authMiddleware, skipProfilePicture);

module.exports = router;
