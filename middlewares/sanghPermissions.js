const User = require('../model/UserRegistrationModels/userModel');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const { errorResponse, successResponse } = require('../utils/apiResponse');
const asyncHandler = require('express-async-handler');

// Helper function to check if a level has access to another level
const hasLevelAccess = (userLevel, targetLevel, isSuperAdmin = false) => {
    // Superadmin has access to all levels
    if (isSuperAdmin) return true;

    const levelHierarchy = {
        'country': ['state', 'district', 'city', 'area'],  // Country president can create any level below
        'state': ['district', 'city', 'area'],            // State president can create any level below
        'district': ['city', 'area'],                     // District president can create any level below
        'city': ['area'],                                 // City president can only create area
        'area': []                                        // Area president cannot create any level
    };

    // If user is at country level, they can create any level below country
    if (userLevel === 'country') {
        return levelHierarchy['country'].includes(targetLevel);
    }
    
    // If user is at state level, they can create any level below state
    if (userLevel === 'state') {
        return levelHierarchy['state'].includes(targetLevel);
    }
    
    // If user is at district level, they can create any level below district
    if (userLevel === 'district') {
        return levelHierarchy['district'].includes(targetLevel);
    }
    
    // If user is at city level, they can only create area level
    if (userLevel === 'city') {
        return targetLevel === 'area';
    }
    
    // Area level users cannot create any Sangh
    return false;
};

// Check if user is president of the Sangh
const isPresident = async (req, res, next) => {
    try {
        const sanghId = req.params.sanghId || req.params.id;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin') {
            const targetSangh = await HierarchicalSangh.findById(sanghId);
            if (!targetSangh) {
                return errorResponse(res, 'Sangh not found', 404);
            }
            req.sangh = targetSangh;
            return next();
        }

        // Check if user has president role for this Sangh
        const hasPresidentRole = req.user.sanghRoles && req.user.sanghRoles.some(role => 
            role.sanghId.toString() === sanghId && role.role === 'president'
        );

        if (!hasPresidentRole) {
            return errorResponse(res, 'You do not have permission to perform this action. Only Sangh president can access this.', 403);
        }

        // Get the Sangh details for use in the controller
        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        req.sangh = sangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user is an office bearer
const isOfficeBearer = asyncHandler(async (req, res, next) => {
    try {
        const sanghId = req.params.sanghId;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin') {
            const targetSangh = await HierarchicalSangh.findById(sanghId);
            if (!targetSangh) {
                return errorResponse(res, 'Sangh not found', 404);
            }
            req.sangh = targetSangh;
            return next();
        }

        // Check if user has any office bearer role for this Sangh
        const hasOfficeBearerRole = req.user.sanghRoles && Array.isArray(req.user.sanghRoles) && req.user.sanghRoles.some(role => 
            role.sanghId.toString() === sanghId && 
            ['president', 'secretary', 'treasurer'].includes(role.role)
        );

        if (!hasOfficeBearerRole) {
            return errorResponse(res, 'You do not have permission to perform this action. Only office bearers can access this.', 403);
        }

        // Get the Sangh details for use in the controller
        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        req.sangh = sangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Middleware to check if user has access to the target level
const canAccessLevel = async (req, res, next) => {
    try {
        const sangh = req.sangh;
        const presidentRole = req.presidentRole;

        if (!presidentRole) {
            return errorResponse(res, 'President role not found', 403);
        }

        if (!hasLevelAccess(presidentRole.level, sangh.level)) {
            return errorResponse(res, `Presidents at ${presidentRole.level} level cannot modify ${sangh.level} level Sanghs`, 403);
        }

        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user can review Jain Aadhar applications based on location
const canReviewJainAadharByLocation = asyncHandler(async (req, res, next) => {
    try {
        const { state, district, city, area } = req.body.location;
        const userId = req.user._id;
        
        // Find all Sanghs where user is an office bearer
        const userSanghs = await HierarchicalSangh.find({
            'officeBearers': {
                $elemMatch: {
                    userId: userId,
                    status: 'active',
                    role: 'president'
                }
            }
        });

        if (!userSanghs || userSanghs.length === 0) {
            return errorResponse(res, 'You do not have permission to review applications', 403);
        }

        // Check if user has authority over the application location
        let hasAuthority = false;
        for (const sangh of userSanghs) {
            switch (sangh.level) {
                case 'country':
                    hasAuthority = true;
                    break;
                case 'state':
                    if (sangh.location.state === state) {
                        hasAuthority = true;
                    }
                    break;
                case 'district':
                    if (sangh.location.state === state && 
                        sangh.location.district === district) {
                        hasAuthority = true;
                    }
                    break;
                case 'city':
                    if (sangh.location.state === state && 
                        sangh.location.district === district && 
                        sangh.location.city === city) {
                        hasAuthority = true;
                    }
                    break;
                case 'area':
                    if (sangh.location.state === state && 
                        sangh.location.district === district && 
                        sangh.location.city === city && 
                        sangh.location.area === area) {
                        hasAuthority = true;
                    }
                    break;
                }
            if (hasAuthority) {
                req.reviewingSanghId = sangh._id;
                req.reviewingLevel = sangh.level;
                break;
            }
        }
        
        if (!hasAuthority) {
            return errorResponse(res, 'You do not have authority to review applications from this location', 403);
        }
        
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Check if user can post as Sangh
const canPostAsSangh = asyncHandler(async (req, res, next) => {
    try {
        const sanghId = req.params.sanghId;
        const userId = req.user._id;
        
        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }
        
        const officeBearer = sangh.officeBearers.find(
            bearer => bearer.userId.toString() === userId.toString() && bearer.status === 'active'
        );

        if (!officeBearer) {
            return errorResponse(res, 'Only office bearers can post as Sangh', 403);
        }

        req.officeBearerRole = officeBearer.role;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Check if user is a Panch member
const isPanchMember = async (req, res, next) => {
    try {
        const panchId = req.params.panchId;
        const userId = req.user._id;
        
        // If user is superadmin, allow access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            // Still need to find the Panch group to attach to req
            const Panch = require('../model/SanghModels/panchModel');
            const panchGroup = await Panch.findById(panchId).lean();
            
            if (!panchGroup) {
                return errorResponse(res, 'Panch group not found', 404);
            }
            
            // Add Panch group to request for controller use
            req.panchGroup = panchGroup;
            req.sanghId = panchGroup.sanghId;
            
            // For admin, we'll set a placeholder member
            req.panchMember = panchGroup.members[0] || { _id: null };
            
            return next();
        }
        
        // Find the Panch group
        const Panch = require('../model/SanghModels/panchModel');
        const User = require('../model/UserRegistrationModels/userModel');
        
        // Get user with panch roles
        const user = await User.findById(userId).select('panchRoles jainAadharNumber').lean();
        
        if (!user || !user.panchRoles || !user.panchRoles.length) {
            return errorResponse(res, 'You are not a member of any Panch group', 403);
        }
        
        // Check if user has a role in this Panch - simplified check without status
        const hasPanchRole = user.panchRoles.some(role => 
            role.panchId.toString() === panchId
        );
        
        if (!hasPanchRole) {
            return errorResponse(res, 'You are not a member of this Panch group', 403);
        }
        
        // Find the Panch group
        const panchGroup = await Panch.findById(panchId).lean();
        
        if (!panchGroup) {
            return errorResponse(res, 'Panch group not found', 404);
        }
        
        // Check if term has expired
        const now = new Date();
        if (now > new Date(panchGroup.term.endDate)) {
            return errorResponse(res, 'Panch term has expired', 403);
        }
        
        // Find the member in the Panch group with matching Jain Aadhar number
        const member = panchGroup.members.find(m => 
            m.personalDetails.jainAadharNumber === user.jainAadharNumber && 
            m.status === 'active'
        );
        
        if (!member) {
            return errorResponse(res, 'No active member found with your Jain Aadhar number in this Panch group', 401);
        }
        
        // Add Panch group and member to request for controller use
        req.panchGroup = panchGroup;
        req.panchMember = member;
        req.sanghId = panchGroup.sanghId;
        
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user can manage area Sangh
const canManageAreaSangh = asyncHandler(async (req, res, next) => {
    try {
        const sanghId = req.params.sanghId;
        const userId = req.user._id;

        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        if (sangh.level !== 'area') {
            return errorResponse(res, 'This operation is only allowed for area level Sanghs', 403);
        }

        const officeBearer = sangh.officeBearers.find(
            bearer => bearer.userId.toString() === userId.toString() && bearer.status === 'active'
        );

        if (!officeBearer) {
            return errorResponse(res, 'You must be an office bearer to manage this area Sangh', 403);
        }

        req.officeBearerRole = officeBearer.role;
        req.sangh = sangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Check if user is a president of a main Sangh
const isMainSanghPresident = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        // Find a Sangh where the user is an active president
        const sangh = await HierarchicalSangh.findOne({
            'officeBearers': {
                $elemMatch: {
                    userId: userId,
                    role: 'president',
                    status: 'active'
                }
            },
            'status': 'active',
            'sanghType': 'main'
        });
        
        if (!sangh) {
            return errorResponse(res, 'You must be an active president of a main Sangh to perform this action', 403);
        }
        
        // Store the sangh in the request for later use
        req.mainSangh = sangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user is a president of a specialized Sangh (women/youth)
// Check if user is a president of a specialized Sangh (women/youth)
const isSpecializedSanghPresident = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { sanghType } = req.body;
        
        // Validate sanghType
        if (!['women', 'youth'].includes(sanghType)) {
            return errorResponse(res, 'Invalid Sangh type. Must be "women" or "youth"', 400);
        }
        
        // Find a Sangh where the user is an active president
        const sangh = await HierarchicalSangh.findOne({
            'officeBearers': {
                $elemMatch: {
                    userId: userId,
                    role: 'president',
                    status: 'active'
                }
            },
            'status': 'active',
            'sanghType': sanghType
        });
        
        if (!sangh) {
            return errorResponse(res, `You must be an active president of a ${sanghType} Sangh to perform this action`, 403);
        }
        
        // Store the sangh in the request for later use
        req.specializedSangh = sangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user can manage specialized Sangh (either as its president or as the main Sangh president)
const canManageSpecializedSangh = asyncHandler(async (req, res, next) => {
    try {
        const sanghId = req.params.sanghId || req.params.id;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const sangh = await HierarchicalSangh.findById(sanghId)
                .select('name level location status officeBearers members sanghType parentMainSangh');
            if (!sangh) {
                return errorResponse(res, 'Sangh not found', 404);
            }
            req.sangh = sangh;
            return next();
        }

        // Get the specialized Sangh - ensure we get all fields needed for member operations
        const specializedSangh = await HierarchicalSangh.findById(sanghId);
        if (!specializedSangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }
        
        console.log('Specialized Sangh found:', specializedSangh.name);
        console.log('Sangh type:', specializedSangh.sanghType);

        // Check if it's a specialized Sangh
        if (specializedSangh.sanghType === 'main') {
            return errorResponse(res, 'This operation is only for specialized Sanghs', 400);
        }

        // Check if user is the president of this specialized Sangh
        const isSpecializedSanghPresident = specializedSangh.officeBearers.some(
            bearer => bearer.userId.toString() === userId.toString() && 
                     bearer.role === 'president' && 
                     bearer.status === 'active'
        );

        // If user is the president of the specialized Sangh, allow access
        if (isSpecializedSanghPresident) {
            req.sangh = specializedSangh;
            return next();
        }

        // If not, check if user is the president of the parent main Sangh
        if (specializedSangh.parentMainSangh) {
            const mainSangh = await HierarchicalSangh.findById(specializedSangh.parentMainSangh);
            
            if (mainSangh) {
                const isMainSanghPresident = mainSangh.officeBearers.some(
                    bearer => bearer.userId.toString() === userId.toString() && 
                             bearer.role === 'president' && 
                             bearer.status === 'active'
                );

                if (isMainSanghPresident) {
                    req.sangh = specializedSangh;
                    return next();
                }
            }
        }

        return errorResponse(res, 'You must be either the president of this specialized Sangh or the president of its parent main Sangh', 403);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Check if user can create specialized Sangh (either as main Sangh president or as specialized Sangh president)
const canCreateSpecializedSangh = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { sanghType, level } = req.body;

        // 1. Allow superadmin or admin full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            return next();
        }

        // 2. Validate sanghType
        if (!['women', 'youth'].includes(sanghType)) {
            return errorResponse(res, 'Invalid Sangh type. Must be "women" or "youth"', 400);
        }

        // 3. Check if user is president of a main Sangh
        const mainSangh = await HierarchicalSangh.findOne({
            'officeBearers': {
                $elemMatch: {
                    userId: userId,
                    role: 'president',
                    status: 'active'
                }
            },
            'sanghType': 'main',
            'status': 'active'
        });

        if (mainSangh) {
            // Get the hierarchy levels in order
            const levelHierarchy = ['country', 'state', 'district', 'city', 'area'];
            const mainSanghLevelIndex = levelHierarchy.indexOf(mainSangh.level);
            const targetLevelIndex = levelHierarchy.indexOf(level);

            // Allow creation only at lower levels (targetLevelIndex should be greater than mainSanghLevelIndex)
            if (targetLevelIndex > mainSanghLevelIndex) {
                // Check if there's already a specialized Sangh of this type at this level and location
                const existingSpecializedSangh = await HierarchicalSangh.findOne({
                    sanghType,
                    level,
                    'status': 'active',
                    'location.country': req.body.location.country,
                    'location.state': req.body.location.state,
                    'location.district': req.body.location.district,
                    'location.city': req.body.location.city,
                    'location.area': req.body.location.area
                });

                if (existingSpecializedSangh) {
                    return errorResponse(res, `A ${sanghType} Sangh already exists at this ${level} level in this location`, 409);
                }

                req.parentSangh = mainSangh;
                req.parentMainSanghId = mainSangh._id;
                return next();
            }
            return errorResponse(res, `As a ${mainSangh.level} level president, you can only create specialized Sanghs at levels below ${mainSangh.level}`, 403);
        }

        // 4. If not a main Sangh president, check if user is president of a specialized Sangh
        const specializedSangh = await HierarchicalSangh.findOne({
            'officeBearers': {
                $elemMatch: {
                    userId: userId,
                    role: 'president',
                    status: 'active'
                }
            },
            'sanghType': sanghType,
            'status': 'active'
        });

        if (!specializedSangh) {
            return errorResponse(res, `You must be a president of either a main Sangh or a ${sanghType} Sangh to create a new ${sanghType} Sangh`, 403);
        }

        // For specialized Sangh presidents, allow creating only lower level Sanghs
        const levelHierarchy = ['country', 'state', 'district', 'city', 'area'];
        const currentLevelIndex = levelHierarchy.indexOf(specializedSangh.level);
        const targetLevelIndex = levelHierarchy.indexOf(level);

        if (targetLevelIndex <= currentLevelIndex) {
            return errorResponse(res, `As a ${specializedSangh.level} level ${sanghType} Sangh president, you can only create lower level ${sanghType} Sanghs`, 403);
        }

        req.parentSangh = specializedSangh;
        req.parentMainSanghId = specializedSangh.parentMainSangh;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});
module.exports = {
    isPresident,
    isOfficeBearer,
    canAccessLevel,
    canReviewJainAadharByLocation,
    canPostAsSangh,
    isPanchMember,
    canManageAreaSangh,
    isMainSanghPresident,
    isSpecializedSanghPresident,
    canManageSpecializedSangh,
    canCreateSpecializedSangh
};