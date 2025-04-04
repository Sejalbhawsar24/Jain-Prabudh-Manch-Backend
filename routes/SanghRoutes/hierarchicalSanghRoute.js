const express = require('express');
const router = express.Router();
const { authMiddleware, isSuperAdmin } = require('../../middlewares/authMiddlewares');
const { validateSanghAccess, canCreateLowerLevelSangh, validateLocationHierarchy, checkSanghCreationPermission } = require('../../middlewares/sanghAuthMiddleware');
const { isOfficeBearer, canManageAreaSangh, canManageSpecializedSangh, canCreateSpecializedSangh } = require('../../middlewares/sanghPermissions');
const {
    createHierarchicalSangh,
    getHierarchy,
    getSanghsByLevelAndLocation,
    getChildSanghs,
    updateHierarchicalSangh,
    addSanghMember,
    removeSanghMember,
    updateMemberDetails,
    getSanghMembers,
    addMultipleSanghMembers,
    getAllSangh,
    checkOfficeBearerTerms,
    createSpecializedSangh,
    getSpecializedSanghs,
    updateSpecializedSangh,
    getAllSanghs
} = require('../../controller/SanghControllers/hierarchicalSanghController');

const upload = require('../../middlewares/upload');

// Protect all routes
router.use(authMiddleware);

// Create new Sangh (Protected + Requires ability to create lower level)
router.post('/create', 
    upload.sangathanDocs,
    checkSanghCreationPermission,
    (req, res, next) => {
        if (req.user.role === 'superadmin') {
            return next();
        }
        validateLocationHierarchy(req, res, next);
    },
    createHierarchicalSangh
);
    // Get all Sangh 
    router.get('/sangh/all',
        getAllSangh
    );
  // Get all Sangh 
  router.get('/all',
    getAllSanghs
);

// Get Sangh hierarchy
router.get('/hierarchy/:id', 
    validateSanghAccess,
    getHierarchy
);

// Get Sanghs by level and location
router.get('/search', 
    getSanghsByLevelAndLocation
);

// Get child Sanghs
router.get('/children/:id', 
    validateSanghAccess,
    getChildSanghs
);

// Update Sangh (Requires office bearer permission)
router.patch('/update/:id', 
    upload.sangathanDocs,
    (req, res, next) => {
        if (req.user.role === 'superadmin') {
            return next();
        }
        validateSanghAccess(req, res, next);
    },
    updateHierarchicalSangh
);

// Member management routes with updated permissions
router.post('/:sanghId/members', 
    (req, res, next) => {
        if (req.user.role === 'superadmin') {
            return next();
        }
        isOfficeBearer(req, res, next);
    },
    upload.fields([
        { name: 'memberJainAadhar', maxCount: 1 },
        { name: 'memberPhoto', maxCount: 1 }
    ]),
    validateSanghAccess,
    addSanghMember
);

router.delete('/:sanghId/members/:memberId', 
    isOfficeBearer,
    validateSanghAccess,
    removeSanghMember
);

router.put('/:sanghId/members/:memberId', 
    isOfficeBearer,
    upload.fields([
        { name: 'memberJainAadhar', maxCount: 1 },
        { name: 'memberPhoto', maxCount: 1 }
    ]),
    validateSanghAccess,
    updateMemberDetails
);

router.get('/:sanghId/members', 
    validateSanghAccess,
    getSanghMembers
);
router.get('/:sanghId/check-terms', 
    authMiddleware,
    checkOfficeBearerTerms
);
// Area-specific routes
router.put('/area/:sanghId', 
    authMiddleware,
    canManageAreaSangh,
    updateHierarchicalSangh
);
router.post('/area/:sanghId/members',
    authMiddleware,
    canManageAreaSangh,
    addSanghMember
);
router.delete('/area/:sanghId/members/:memberId',
    authMiddleware,
    canManageAreaSangh,
    removeSanghMember
);
// Create specialized Sangh (Women/Youth) - For both main Sangh presidents and specialized Sangh presidents
router.post('/create-specialized-sangh',
  authMiddleware,
    upload.sangathanDocs,
  canCreateSpecializedSangh,
    createSpecializedSangh
);

// Get specialized Sanghs for a main Sangh
router.get('/:sanghId/specialized-sanghs',
    validateSanghAccess,
    getSpecializedSanghs
);

// Update specialized Sangh - Accessible by both specialized Sangh president and parent main Sangh president
router.put('/specialized/:sanghId',
    authMiddleware,
    canManageSpecializedSangh,
    upload.sangathanDocs,
    updateSpecializedSangh
);

// Specialized Sangh member management routes
router.post('/specialized/:sanghId/members',
    authMiddleware,
    canManageSpecializedSangh,
    upload.fields([
        { name: 'memberJainAadhar', maxCount: 1 },
        { name: 'memberPhoto', maxCount: 1 }
    ]),
    addSanghMember
);

router.post('/specialized/:sanghId/members/bulk',
    authMiddleware,
    canManageSpecializedSangh,
    addMultipleSanghMembers
);

router.delete('/specialized/:sanghId/members/:memberId',
    authMiddleware,
    canManageSpecializedSangh,
    removeSanghMember
);

// Add route for updating member details in specialized Sanghs
router.put('/specialized/:sanghId/members/:memberId',
    authMiddleware,
    canManageSpecializedSangh,
    upload.fields([
        { name: 'memberJainAadhar', maxCount: 1 },
        { name: 'memberPhoto', maxCount: 1 }
    ]),
    updateMemberDetails
);
module.exports = router; 