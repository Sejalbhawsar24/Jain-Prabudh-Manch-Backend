const express = require('express');
const router = express.Router();
const { authMiddleware, isSuperAdmin } = require('../../middlewares/authMiddlewares');
const { validateSanghAccess, canCreateLowerLevelSangh } = require('../../middlewares/sanghAuthMiddleware');
const {
    generateSanghAccess,
    validateAccess,
    getLowerLevelSanghs,
    revokeSanghAccess
} = require('../../controller/SanghControllers/sanghAccessController');

// Protect all routes
router.use(authMiddleware);

// Generate access for new Sangh
// NOTE: This endpoint is now optional as access is automatically created when creating a Sangh
// It's kept for backward compatibility and special cases
//Ye wala route abhi nhi use hoga ye special case ke liye hai
router.post('/generate', 
    (req, res, next) => {
        // If it's for country level, check for superadmin
        if (req.body.level === 'country') {
            return isSuperAdmin(req, res, next);
        }
        // For other levels, validate parent Sangh access
        validateSanghAccess(req, res, () => {
            canCreateLowerLevelSangh(req, res, next);
        });
    },
    generateSanghAccess
);

// Validate Sangh access credentials (Protected)
router.post('/validate', validateAccess);

// Get lower level Sanghs (Protected + Requires valid Sangh access)
router.get('/lower-level/:accessId', validateSanghAccess, getLowerLevelSanghs);

// Revoke Sangh access (Protected + Requires valid Sangh access)
router.patch('/revoke/:accessId', validateSanghAccess, revokeSanghAccess);

module.exports = router;