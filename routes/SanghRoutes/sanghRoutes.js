const express = require('express');
const router = express.Router();
const { 
    createSangh, 
    getAllSanghs, 
    getSanghById, 
    addMember, 
    removeMember, 
    updateSangh,
    getHierarchy,
    getChildSanghs,
    getParentSangh,
    updateMemberFeeStatus,
    getSanghFeeStats
} = require('../../controller/SanghControllers/sanghController');
const { protect } = require('../../middlewares/authMiddlewares');
const { isPresident, isOfficeBearer, canAccessLevel } = require('../../middlewares/sanghPermissions');
const upload = require('../../middlewares/upload');

// Public routes (still need authentication)
router.get('/', protect, getAllSanghs);
router.get('/:id', protect, getSanghById);

// Hierarchy routes
router.get('/:id/hierarchy', protect, getHierarchy);
router.get('/:id/children', protect, getChildSanghs);
router.get('/:id/parent', protect, getParentSangh);

// President-only routes with level access control
router.post('/:sanghId/members', protect, isPresident, canAccessLevel, addMember);
router.delete('/:sanghId/members/:memberId', protect, isPresident, canAccessLevel, removeMember);
router.put('/:id', protect, isPresident, canAccessLevel, upload.fields([
    { name: 'presidentJainAadhar', maxCount: 1 },
    { name: 'presidentPhoto', maxCount: 1 },
    { name: 'secretaryJainAadhar', maxCount: 1 },
    { name: 'secretaryPhoto', maxCount: 1 },
    { name: 'treasurerJainAadhar', maxCount: 1 },
    { name: 'treasurerPhoto', maxCount: 1 }
]), updateSangh);


router.put('/:sanghId/members/:memberId/fee-status', 
  protect, 
  isOfficeBearer, 
  updateMemberFeeStatus
);

router.get('/:sanghId/fee-stats',
  protect,
  isOfficeBearer,
  getSanghFeeStats
);

module.exports = router; 