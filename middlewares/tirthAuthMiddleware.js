const Tirth = require('../model/TirthModels/tirthModel');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const UserRoleService = require('../services/userRoleService');

// Verify tirth owner using JWT token and role
const verifyTirthOwner = async (req, res, next) => {
    try {
        const { tirthId } = req.params;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const tirth = await Tirth.findById(tirthId);
            if (!tirth) {
                return errorResponse(res, 'Tirth not found', 404);
            }
            req.tirth = tirth;
            return next();
        }

        // Check if user has owner role for this Tirth
        const hasTirthRole = req.user.tirthRoles && req.user.tirthRoles.some(role => 
            role.tirthId.toString() === tirthId && role.role === 'owner'
        );

        if (!hasTirthRole) {
            return errorResponse(res, 'You do not have permission to access this Tirth', 403);
        }

        const tirth = await Tirth.findById(tirthId);
        if (!tirth) {
            return errorResponse(res, 'Tirth not found', 404);
        }

        req.tirth = tirth;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Verify if user can review tirth (city president)
const canReviewTirth = async (req, res, next) => {
    try {
        let citySanghId;
        
        // For review endpoint, first get the tirth details
        if (req.params.tirthId) {
            const tirth = await Tirth.findById(req.params.tirthId);
            if (!tirth) {
                return errorResponse(res, 'Tirth not found', 404);
            }
            citySanghId = tirth.citySanghId;
            req.tirth = tirth;
        } else {
            // For pending applications endpoint
            citySanghId = req.params.citySanghId;
        }

        if (!citySanghId) {
            return errorResponse(res, 'City Sangh ID is required', 400);
        }
        
        // Check if user has president role for this city
        const hasPresidentRole = req.user.sanghRoles && req.user.sanghRoles.some(role => 
            role.sanghId.toString() === citySanghId.toString() && 
            role.role === 'president'
        );
        
        if (!hasPresidentRole) {
            return errorResponse(res, 'Unauthorized: Only city president can perform this action', 403);
        }
        
        // Get the city Sangh for additional context if needed
        const citySangh = await HierarchicalSangh.findOne({
            _id: citySanghId,
            level: 'city'
        });
        
        if (!citySangh) {
            return errorResponse(res, 'City Sangh not found', 404);
        }
        
        req.citySangh = citySangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Verify tirth post management permissions
const canManageTirthPost = async (req, res, next) => {
    try {
        const { tirthId } = req.params;
        const userId = req.user._id;

        if (!tirthId) {
            return errorResponse(res, 'Tirth ID required', 400);
        }

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const tirth = await Tirth.findById(tirthId);
            if (!tirth) {
                return errorResponse(res, 'Tirth not found', 404);
            }
            req.tirth = tirth;
            return next();
        }

        // Check if user has manager or owner role for this Tirth
        const hasTirthRole = req.user.tirthRoles && req.user.tirthRoles.some(role => 
            role.tirthId.toString() === tirthId && 
            ['owner', 'manager', 'admin'].includes(role.role)
        );

        if (!hasTirthRole) {
            return errorResponse(res, 'Unauthorized: Only Tirth managers can perform this action', 403);
        }

        const tirth = await Tirth.findOne({
            _id: tirthId,
            applicationStatus: 'approved',
            status: 'active'
        });

        if (!tirth) {
            return errorResponse(res, 'Tirth not found or inactive', 404);
        }

        req.tirth = tirth;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user can view Tirth details
const canViewTirth = async (req, res, next) => {
    try {
        const { tirthId } = req.params;

        const tirth = await Tirth.findOne({
            _id: tirthId,
            status: 'active'
        });

        if (!tirth) {
            return errorResponse(res, 'Tirth not found or inactive', 404);
        }

        req.tirth = tirth;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user is authorized to manage Tirth
const canManageTirth = async (req, res, next) => {
    try {
        const { tirthId } = req.params;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const tirth = await Tirth.findById(tirthId);
            if (!tirth) {
                return errorResponse(res, 'Tirth not found', 404);
            }
            req.tirth = tirth;
            return next();
        }

        // Check if user has manager or owner role for this Tirth
        const hasTirthRole = req.user.tirthRoles && req.user.tirthRoles.some(role => 
            role.tirthId.toString() === tirthId && 
            ['owner', 'manager'].includes(role.role)
        );

        if (!hasTirthRole) {
            return errorResponse(res, 'Unauthorized: Only Tirth managers can perform this action', 403);
        }

        const tirth = await Tirth.findOne({
            _id: tirthId,
            status: 'active'
        });

        if (!tirth) {
            return errorResponse(res, 'Tirth not found or inactive', 404);
        }

        req.tirth = tirth;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

module.exports = {
    verifyTirthOwner,
    canReviewTirth,
    canManageTirthPost,
    canViewTirth,
    canManageTirth
};