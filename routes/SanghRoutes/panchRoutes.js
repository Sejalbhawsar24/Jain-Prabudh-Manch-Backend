const express = require('express');
const router = express.Router();
const {
    validateSangh,
    createPanchGroup,
    getPanchGroup,
    getPanchMembers,
    updatePanchStatus,
    editPanchMember,
    deletePanchGroup,
    getAllPanchGroups
} = require('../../controller/SanghControllers/panchController');
const { authenticate } = require('../../middlewares/authMiddlewares');
const { isPresident } = require('../../middlewares/sanghPermissions');
const { panchGroupDocs } = require('../../middlewares/upload');

// Protect all routes
router.use(authenticate);

// Validate Sangh ID
// router.get('/validate/:sanghId', validateSangh);

// Panch group management
router.post('/:sanghId/group', isPresident, panchGroupDocs, createPanchGroup);
router.get('/:sanghId/group', getPanchGroup);
router.get('/panch-groups', getAllPanchGroups);
router.delete('/:sanghId/group', isPresident, deletePanchGroup);

// Member management routes
router.get('/:sanghId/members', getPanchMembers);
router.put('/:sanghId/members/:panchId/status', isPresident, panchGroupDocs, updatePanchStatus);
router.put('/:sanghId/members/:panchId', isPresident, editPanchMember);

module.exports = router; 