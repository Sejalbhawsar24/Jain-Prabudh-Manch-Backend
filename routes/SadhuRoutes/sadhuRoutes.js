const express = require('express');
const router = express.Router();
const { 
    submitSadhuInfo,
    reviewSadhuSubmission,
    getAllSadhus,
    getSadhuById,
    sadhuLogin,
    updateSadhuProfile,
    getAvailableCities,
    getPendingSadhuApplications,
    getAllSadhu
} = require('../../controller/SadhuControllers/sadhuController');
const { 
    authMiddleware,
    verifySadhuRole
} = require('../../middlewares/authMiddlewares');
const { verifySadhuCredentials, isCityPresident } = require('../../middlewares/sadhuAuthMiddleware');
const upload = require('../../middlewares/upload');

// Public routes
router.get('/available-cities', getAvailableCities);
router.get('/', getAllSadhus);
router.get('/all',getAllSadhu)
router.get('/:sadhuId', getSadhuById);

// Protected routes - require user authentication
router.use(authMiddleware);

// Application routes
router.post('/apply',
    upload.sadhuDocs,
    submitSadhuInfo
);

// City president routes
router.get('/pending/:citySanghId',
    isCityPresident,
    getPendingSadhuApplications
);

router.put('/review/:sadhuId',
    isCityPresident,
    reviewSadhuSubmission
);

// Sadhu dashboard routes - require sadhu role
router.put('/update/:sadhuId',
    verifySadhuRole,
    upload.sadhuDocs,
    updateSadhuProfile
);

module.exports = router;
