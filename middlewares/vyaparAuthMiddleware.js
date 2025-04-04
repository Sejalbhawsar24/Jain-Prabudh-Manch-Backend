const JainVyapar = require('../model/VyaparModels/vyaparModel');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const { errorResponse } = require('../utils/apiResponse');
const UserRoleService = require('../services/userRoleService');

// Verify business post management permissions
const canManageBusinessPost = async (req, res, next) => {
    try {
        const { vyaparId } = req.params;
        const userId = req.user._id;
        
        if (!vyaparId) {
            return errorResponse(res, 'Business ID required', 400);
        }

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const business = await JainVyapar.findById(vyaparId);
            if (!business) {
                return errorResponse(res, 'Business not found', 404);
            }
            req.business = business;
            return next();
        }

        // Check if user has manager or owner role for this business
        const hasVyaparRole = req.user.vyaparRoles && req.user.vyaparRoles.some(role => 
            role.vyaparId.toString() === vyaparId && 
            ['owner', 'manager', 'admin'].includes(role.role)
        );

        if (!hasVyaparRole) {
            return errorResponse(res, 'Unauthorized: Only business managers can perform this action', 403);
        }

        // Just check if business exists, no status check needed
        const business = await JainVyapar.findById(vyaparId);

        if (!business) {
            return errorResponse(res, 'Business not found', 404);
        }

        req.business = business;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

module.exports = {
    canManageBusinessPost
};
