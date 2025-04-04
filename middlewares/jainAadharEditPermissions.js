const asyncHandler = require('express-async-handler');
const JainAadhar = require('../model/UserRegistrationModels/jainAadharModel');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');

// Check if user has permission to edit Jain Aadhar application
const canEditJainAadhar = asyncHandler(async (req, res, next) => {
    try {
        //console.log("User Info:", req.user);  // Debugging line
       // console.log("User Role:", req.user.role);  // Debugging line
        const applicationId = req.params.id;
        const application = await JainAadhar.findById(applicationId).populate('reviewingSanghId');

        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        // Superadmin check
        if (req.user.role === 'superadmin') {
            console.log("Superadmin detected!"); // Debugging line
            req.editingLevel = 'superadmin';
            return next();
        }

        console.log("Superadmin check failed! Proceeding with hierarchical check...");

        // Hierarchical role check
        const userSanghRoles = req.user.sanghRoles || [];
        const presidentRole = userSanghRoles.find(role => 
            role.role === 'president' && 
            ['country', 'state', 'district', 'city'].includes(role.level)
        );

        if (!presidentRole) {
            return res.status(403).json({
                success: false,
                message: 'No permission to edit applications'
            });
        }

        // Rest of the code remains the same...
        next();
    } catch (error) {
        console.error("Middleware Error:", error);
        return res.status(500).json({ success: false, message: 'Error checking edit permissions', error: error.message });
    }
});


// Helper function to check location match
const checkLocationMatch = (sanghLocation, applicationLocation, level) => {
    switch (level) {
        case 'area':
            return sanghLocation.state === applicationLocation.state &&
                   sanghLocation.district === applicationLocation.district &&
                   sanghLocation.city === applicationLocation.city &&
                   sanghLocation.area === applicationLocation.area;
        case 'city':
            return sanghLocation.state === applicationLocation.state &&
                   sanghLocation.district === applicationLocation.district &&
                   sanghLocation.city === applicationLocation.city;
        case 'district':
            return sanghLocation.state === applicationLocation.state &&
                   sanghLocation.district === applicationLocation.district;
        case 'state':
            return sanghLocation.state === applicationLocation.state;
        case 'country':
            return true; // Country president can edit any location
        default:
            return false;
    }
};

module.exports = {
    canEditJainAadhar
};
