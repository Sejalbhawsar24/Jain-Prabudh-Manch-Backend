const SanghAccess = require('../../model/SanghModels/sanghAccessModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const asyncHandler = require('express-async-handler');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

// Generate Sangh Access for new Sangh
const generateSanghAccess = asyncHandler(async (req, res) => {
    try {
        const { sanghId, level, location } = req.body;
        const userId = req.user._id;

        // Validate if Sangh exists using HierarchicalSangh model
        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        // Check if access already exists
        const existingAccess = await SanghAccess.findOne({ 
            sanghId,
            status: 'active'
        });
        
        if (existingAccess) {
            return errorResponse(res, 'Access already exists for this Sangh', 400);
        }

        // Create new Sangh access
        const sanghAccess = await SanghAccess.create({
            sanghId,
            level,
            location,
            createdBy: userId,
            parentSanghAccess: req.body.parentSanghAccess
        });

        return successResponse(res, {
            accessId: sanghAccess.accessId,
            level: sanghAccess.level
        }, 'Sangh access created successfully', 201);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Validate Sangh Access Credentials
const validateAccess = asyncHandler(async (req, res) => {
    try {
        const { accessId, level, jainAadharNumber } = req.body;

        if (!accessId || !level || !jainAadharNumber) {
            return errorResponse(res, 'AccessId, level, and Jain Aadhar number are required', 400);
        }

        // First try to find the Sangh directly using its accessId
        let sangh = await HierarchicalSangh.findOne({
            accessId,
            level,
            status: 'active'
        });

        // If not found, try to find via SanghAccess model
        if (!sangh) {
            const sanghAccess = await SanghAccess.findOne({
                accessId,
                level,
                status: 'active'
            });

            if (sanghAccess) {
                sangh = await HierarchicalSangh.findById(sanghAccess.sanghId);
            }
        }

        if (!sangh) {
            return errorResponse(res, 'Invalid access credentials', 401);
        }

        // Find the office bearer using Jain Aadhar
        const officeBearer = sangh.officeBearers.find(
            bearer => bearer.jainAadharNumber === jainAadharNumber && bearer.status === 'active'
        );

        if (!officeBearer) {
            return errorResponse(res, 'You are not an authorized office bearer of this Sangh', 403);
        }

        // Get user details
        const user = await User.findById(officeBearer.userId);
        if (!user || user.jainAadharStatus !== 'verified') {
            return errorResponse(res, 'Invalid or unverified Jain Aadhar', 401);
        }

        return successResponse(res, {
            sanghId: sangh._id,
            name: sangh.name,
            level: sangh.level,
            role: officeBearer.role,
            officeBearerDetails: {
                name: officeBearer.name,
                role: officeBearer.role
            }
        }, 'Access validated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get Lower Level Sanghs
const getLowerLevelSanghs = asyncHandler(async (req, res) => {
    try {
        const { accessId } = req.params;
        
        const sanghAccess = await SanghAccess.findOne({ accessId });
        if (!sanghAccess) {
            return errorResponse(res, 'Invalid access ID', 404);
        }

        const hierarchyOrder = ['country', 'state', 'district', 'city'];
        const currentLevel = sanghAccess.level;
        const currentIndex = hierarchyOrder.indexOf(currentLevel);
        
        if (currentIndex === hierarchyOrder.length - 1) {
            return errorResponse(res, 'No lower levels available', 400);
        }

        const nextLevel = hierarchyOrder[currentIndex + 1];
        
        const lowerLevelSanghs = await SanghAccess.find({
            parentSanghAccess: sanghAccess._id,
            level: nextLevel,
            status: 'active'
        }).populate('sanghId');

        return successResponse(res, lowerLevelSanghs, 'Lower level Sanghs retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Revoke Sangh Access
const revokeSanghAccess = asyncHandler(async (req, res) => {
    try {
        const { accessId } = req.params;
        
        const sanghAccess = await SanghAccess.findOne({ accessId });
        if (!sanghAccess) {
            return errorResponse(res, 'Invalid access ID', 404);
        }

        // Check if user has permission to revoke access
        const user = req.user;
        if (user.role !== 'superadmin' && sanghAccess.createdBy.toString() !== user._id.toString()) {
            return errorResponse(res, 'You do not have permission to revoke this access', 403);
        }

        sanghAccess.status = 'inactive';
        await sanghAccess.save();

        return successResponse(res, null, 'Sangh access revoked successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
    generateSanghAccess,
    validateAccess,
    getLowerLevelSanghs,
    revokeSanghAccess
}; 