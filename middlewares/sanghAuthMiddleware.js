const asyncHandler = require('express-async-handler');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const User = require('../model/UserRegistrationModels/userModel');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const UserRoleService = require('../services/userRoleService');

// Validate Sangh Access
const validateSanghAccess = asyncHandler(async (req, res, next) => {
    try {
        const sanghId = req.params.sanghId || req.params.id;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const sangh = await HierarchicalSangh.findById(sanghId)
                .select('name level location status officeBearers members sanghType');
                
            if (!sangh) {
                return errorResponse(res, 'Sangh not found', 404);
            }
            
            // If this is a specialized Sangh and not using the specialized routes, redirect to use those
            if (sangh.sanghType !== 'main' && !req.originalUrl.includes('/specialized/')) {
                return errorResponse(res, 'Please use the specialized Sangh routes for this operation', 400);
            }
            
            req.sangh = sangh;
            return next();
        }

        // Run queries in parallel and select only needed fields
        const [sangh, user] = await Promise.all([
            HierarchicalSangh.findById(sanghId)
                .select('name level location status officeBearers members sanghType'),
            User.findById(userId)
                .select('sanghRoles')
                .lean()
        ]);

        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        // If this is a specialized Sangh and not using the specialized routes, redirect to use those
        if (sangh.sanghType !== 'main' && !req.originalUrl.includes('/specialized/')) {
            return errorResponse(res, 'Please use the specialized Sangh routes for this operation', 400);
        }

        // Check if user is an office bearer of this Sangh
        const hasRole = user.sanghRoles && Array.isArray(user.sanghRoles) && user.sanghRoles.some(role => 
            role.sanghId.toString() === sanghId &&
            ['president', 'secretary', 'treasurer'].includes(role.role)
        );

        if (!hasRole) {
            return errorResponse(res, 'You are not authorized to access this Sangh', 403);
        }

        req.sangh = sangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Check if user can create lower level Sangh
const canCreateLowerLevelSangh = asyncHandler(async (req, res, next) => {
    try {
        const { level, parentSanghId } = req.body;
        const userId = req.user._id;
        
        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            return next();
        }
        
        if (!parentSanghId) {
            return errorResponse(res, 'Parent Sangh ID is required', 400);
        }
        
        // Get the parent Sangh
        const parentSangh = await HierarchicalSangh.findById(parentSanghId);
        if (!parentSangh) {
            return errorResponse(res, 'Parent Sangh not found', 404);
        }
        
        // Check if user has president role for the parent Sangh
        const hasPresidentRole = req.user.sanghRoles && req.user.sanghRoles.some(role => 
            role.sanghId.toString() === parentSanghId && 
            role.role === 'president'
        );
        
        if (!hasPresidentRole) {
            return errorResponse(res, 'You do not have permission to create a Sangh under this parent', 403);
        }
        
        // Check if the level hierarchy is valid
        const levelHierarchy = {
            'country': ['state', 'district', 'city', 'area'],
            'state': ['district', 'city', 'area'],
            'district': ['city', 'area'],
            'city': ['area'],
            'area': []
        };
        
        if (!levelHierarchy[parentSangh.level].includes(level)) {
            return errorResponse(res, `A ${parentSangh.level} level Sangh cannot create a ${level} level Sangh`, 400);
        }
        
        // Add parent Sangh to request
        req.parentSangh = parentSangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Validate location hierarchy
const validateLocationHierarchy = asyncHandler(async (req, res, next) => {
    try {
        const { level, location, parentSanghId } = req.body;
        
        if (!parentSanghId) {
            return errorResponse(res, 'Parent Sangh ID is required', 400);
        }
        
        // Get the parent Sangh if not already in the request
        if (!req.parentSangh) {
            const parentSangh = await HierarchicalSangh.findById(parentSanghId);
            if (!parentSangh) {
                return errorResponse(res, 'Parent Sangh not found', 404);
            }
            req.parentSangh = parentSangh;
        }
        
        const parentSangh = req.parentSangh;
        
        // Validate location hierarchy based on level
        switch (level) {
            case 'state':
                if (parentSangh.level !== 'country') {
                    return errorResponse(res, 'State can only be created under Country', 400);
                }
                if (parentSangh.location.country !== location.country) {
                    return errorResponse(res, 'State must be in the same country as the parent', 400);
                }
                break;
                
            case 'district':
                if (!['country', 'state'].includes(parentSangh.level)) {
                    return errorResponse(res, 'District can only be created under Country or State', 400);
                }
                if (parentSangh.location.country !== location.country) {
                    return errorResponse(res, 'District must be in the same country as the parent', 400);
                }
                if (parentSangh.level === 'state' && parentSangh.location.state !== location.state) {
                    return errorResponse(res, 'District must be in the same state as the parent', 400);
                }
                break;
                
            case 'city':
                if (!['country', 'state', 'district'].includes(parentSangh.level)) {
                    return errorResponse(res, 'City can only be created under Country, State, or District', 400);
                }
                if (parentSangh.location.country !== location.country) {
                    return errorResponse(res, 'City must be in the same country as the parent', 400);
                }
                if (['state', 'district'].includes(parentSangh.level) && parentSangh.location.state !== location.state) {
                    return errorResponse(res, 'City must be in the same state as the parent', 400);
                }
                if (parentSangh.level === 'district' && parentSangh.location.district !== location.district) {
                    return errorResponse(res, 'City must be in the same district as the parent', 400);
                }
                break;
                
            case 'area':
                if (!['country', 'state', 'district', 'city'].includes(parentSangh.level)) {
                    return errorResponse(res, 'Area can only be created under Country, State, District, or City', 400);
                }
                if (parentSangh.location.country !== location.country) {
                    return errorResponse(res, 'Area must be in the same country as the parent', 400);
                }
                if (['state', 'district', 'city'].includes(parentSangh.level) && parentSangh.location.state !== location.state) {
                    return errorResponse(res, 'Area must be in the same state as the parent', 400);
                }
                if (['district', 'city'].includes(parentSangh.level) && parentSangh.location.district !== location.district) {
                    return errorResponse(res, 'Area must be in the same district as the parent', 400);
                }
                if (parentSangh.level === 'city' && parentSangh.location.city !== location.city) {
                    return errorResponse(res, 'Area must be in the same city as the parent', 400);
                }
                break;
                
            default:
                return errorResponse(res, 'Invalid Sangh level', 400);
        }
        
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Check Sangh creation permission
const checkSanghCreationPermission = asyncHandler(async (req, res, next) => {
    try {
        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            return next();
        }
        
        const { level, parentSanghId } = req.body;
        const userId = req.user._id;
        
        if (!parentSanghId) {
            return errorResponse(res, 'Parent Sangh ID is required for non-admin users', 400);
        }

        // Find the user's highest level Sangh president role
        const presidentRole = req.user.sanghRoles?.find(role => 
            role.role === 'president' && 
            role.sanghType === 'main'
        );

        if (!presidentRole) {
            return errorResponse(res, 'You must be a Sangh president to create sub-Sanghs', 403);
        }

        // Get the parent Sangh details
        const parentSangh = await HierarchicalSangh.findById(parentSanghId)
            .select('level sanghType')
            .lean();

        if (!parentSangh) {
            return errorResponse(res, 'Parent Sangh not found', 404);
        }

        // Check if parent Sangh is main type
        if (parentSangh.sanghType !== 'main') {
            return errorResponse(res, 'Parent Sangh must be a main Sangh', 400);
        }

        // Get the hierarchy levels in order
        const levelHierarchy = ['country', 'state', 'district', 'city', 'area'];
        const userLevelIndex = levelHierarchy.indexOf(presidentRole.level);
        const parentLevelIndex = levelHierarchy.indexOf(parentSangh.level);
        const targetLevelIndex = levelHierarchy.indexOf(level);

        // Allow creation only if:
        // 1. User's level is higher than both parent and target level
        // 2. Parent level is higher than target level
        if (userLevelIndex > targetLevelIndex || userLevelIndex > parentLevelIndex) {
            return errorResponse(res, `As a ${presidentRole.level} level president, you cannot create or use Sanghs at higher levels`, 403);
        }

        if (parentLevelIndex >= targetLevelIndex) {
            return errorResponse(res, `Parent Sangh's level (${parentSangh.level}) must be higher than the new Sangh's level (${level})`, 400);
        }
        
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
    validateSanghAccess,
    canCreateLowerLevelSangh,
    validateLocationHierarchy,
    checkSanghCreationPermission
};