const express = require('express');
const router = express.Router();
const { authMiddleware, verifyTirthRole } = require('../../middlewares/authMiddlewares');
const upload = require('../../middlewares/upload');
const {
    canManageTirthPost,
    canReviewTirth,
    canManageTirth,
    canViewTirth
} = require('../../middlewares/tirthAuthMiddleware');
const {
    getAvailableCities,
    submitTirthApplication,
    getPendingApplications,
    reviewApplication,
    getTirthDetails,
    updateTirthDetails,
    getCityTirths,
    tirthLogin,
    getAllTirths,
    getAllTirth
} = require('../../controller/TirthControllers/tirthController');

// Public routes
router.get('/available-cities', getAvailableCities);
router.get('/city/:citySanghId', getCityTirths);
router.get('/', getAllTirths);
router.get('/get', getAllTirth);


// Protected routes - require user authentication
router.use(authMiddleware);

// Tirth access route - uses JWT token now
router.get('/access/:tirthId', verifyTirthRole, tirthLogin);

// Application routes
router.post('/apply', 
    upload.tirthDocs,
    submitTirthApplication
);

// City president routes
router.get('/pending/:citySanghId', 
    canReviewTirth,
    getPendingApplications
);

router.put('/review/:tirthId',
    canReviewTirth,
    reviewApplication
);

// Tirth viewing routes
router.get('/details/:tirthId',
   // verifyTirthRole,
    getTirthDetails
);

// Tirth management routes - require tirth manager role
router.put('/update/:tirthId',
    verifyTirthRole,
    canManageTirth,
    upload.tirthDocs,
    updateTirthDetails
);

module.exports = router;