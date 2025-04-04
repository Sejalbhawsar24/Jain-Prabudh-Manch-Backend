// server/routes/SanghRoutes/sanghRoute.js
const express = require('express');
const router = express.Router();
const {
  createSangh,
  getAllSanghs,
  getSanghById,
  manageMember,
  updateSangh,
  editMemberDetails
} = require('../../controller/SanghControllers/sanghController');
const { authMiddleware } = require('../../middlewares/authMiddlewares');
const { sangathanDocs } = require('../../middlewares/upload');
const { isPresident } = require('../../middlewares/sanghPermissions');
const { upload } = require('../../middlewares/upload');

// Protect all routes
router.use(authMiddleware);

// Sangh management routes
router.post('/create', sangathanDocs, createSangh);
router.get('/', getAllSanghs);
router.get('/:id', getSanghById);

// Protected routes that require president access
router.put('/:id', isPresident, sangathanDocs, updateSangh);
router.post('/:sanghId/members', isPresident, manageMember);
router.delete('/:sanghId/members/:memberId', isPresident, manageMember);

// Add new route for editing member details
router.put(
  '/:sanghId/members/:memberId',
  isPresident,
  sangathanDocs,
  editMemberDetails
);

// Error handling middleware


module.exports = router;