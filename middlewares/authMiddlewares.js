const User = require('../model/UserRegistrationModels/userModel'); 
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const dotenv = require("dotenv").config();
const Sadhu = require('../model/SadhuModels/sadhuModel');

// Log middleware function
const logMiddleware = (req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
};

// Authenticate middleware function
const authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }
  
      const token = authHeader.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
  
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id);
  
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
  
        if (token !== user.token) {
          return res.status(401).json({ message: 'Invalid token' });
        }
  
        req.user = user;
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired' });
        }
        throw error;
      }
    } catch (error) {
      console.error('Auth Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Auth middleware function
  const authMiddleware = asyncHandler(async (req, res, next) => {
      try {
          const token = req.headers.authorization?.split(" ")[1];
  
          if (!token) {
              return res.status(401).json({
                  success: false,
                  message: "No token attached to headers"
              });
          }
  
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded._id)
              .select('-password -__v');
  
          if (!user) {
              return res.status(401).json({
                  success: false,
                  message: "User not found"
              });
          }
  
          // Check if token matches stored token
          if (token !== user.token) {
              return res.status(401).json({
                  success: false,
                  message: "Session expired or invalid. Please login again."
              });
          }
  
          req.user = user;
          next();
      } catch (error) {
          return res.status(401).json({
              success: false,
              message: "Authentication failed",
              error: error.message
          });
      }
  });  

// Admin middleware
const isAdmin = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (user.role !== 'admin' && user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
});

// Superadmin middleware
const isSuperAdmin = asyncHandler(async (req, res, next) => {
    const user = req.user;
    if (user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Superadmin privileges required.'
        });
    }
    next();
});

// Check if user has Jain Aadhar review permissions
const canReviewJainAadhar = asyncHandler(async (req, res, next) => {
    const user = req.user;
    
    // Check for superadmin or admin with verify permissions
    if (user.role === 'superadmin' || (user.role === 'admin' && user.adminPermissions.includes('verify_jain_aadhar'))) {
        req.reviewerLevel = user.role === 'superadmin' ? 'superadmin' : 'admin';
        return next();
    }
      // Check for superadmin or admin with verify permissions
    //   if (user.role === 'superadmin' || (user.role === 'admin')) {
    //     req.reviewerLevel = user.role === 'superadmin' ? 'superadmin' : 'admin';
    //     return next();
    // }
       // Normal users can access only their own applications
       if (user.role === "user") {
        req.reviewerLevel = "user";
        return next();
    }

    // Check for any president roles (country, state, district, or city)
    const presidentRole = user.sanghRoles?.find(role => 
        role.role === 'president' && ['country', 'state', 'district', 'city'].includes(role.level)
    );
    
    if (presidentRole) {
        // Set reviewer level and sanghId for use in controllers
        req.reviewerLevel = presidentRole.level;
        req.reviewerSanghId = presidentRole.sanghId;
        return next();
    }
    
    return res.status(403).json({
        success: false,
        message: 'Access denied. Jain Aadhar review privileges required.'
    });
});

// Check trial period or Jain Aadhar verification
const checkAccess = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const currentDate = new Date();

    // If user is verified with Jain Aadhar, allow access
    if (user.jainAadharStatus === 'verified') {
        return next();
    }

    // If trial period has not expired, allow access
    if (user.trialPeriodEnd && new Date(user.trialPeriodEnd) > currentDate) {
        return next();
    }

    // If user has pending Jain Aadhar verification, allow limited access
    if (user.jainAadharStatus === 'pending') {
        return res.status(403).json({
            success: false,
            message: 'Your Jain Aadhar verification is pending. Some features may be limited.',
            status: 'pending'
        });
    }

    // If trial period has expired and no Jain Aadhar verification
    return res.status(403).json({
        success: false,
        message: 'Trial period expired. Please verify your Jain Aadhar to continue using all features.',
        status: 'expired'
    });
});
// Verify Sangh role middleware
const verifySanghRole = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const sanghId = req.params.sanghId || req.params.id;
    
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    
    // Check if user has any Sangh role for this Sangh
    const hasSanghRole = user.sanghRoles && user.sanghRoles.some(role => 
        role.sanghId.toString() === sanghId
    );
    
    if (!hasSanghRole) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this Sangh'
        });
    }
    
    next();
});

// Verify Panch role middleware
const verifyPanchRole = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const panchId = req.params.panchId || req.params.id;
    
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    
    // Check if user has any Panch role for this Panch
    const hasPanchRole = user.panchRoles && user.panchRoles.some(role => 
        role.panchId.toString() === panchId
    );
    
    if (!hasPanchRole) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this Panch'
        });
    }
    
    next();
});

// Verify Tirth role middleware
const verifyTirthRole = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const tirthId = req.params.tirthId;
    
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    
    // Check if user has any Tirth role for this Tirth
    const hasTirthRole = user.tirthRoles && user.tirthRoles.some(role => 
        role.tirthId.toString() === tirthId
    );
    
    if (!hasTirthRole) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this Tirth'
        });
    }
    next();
});

// Verify Vyapar role middleware
const verifyVyaparRole = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const vyaparId = req.params.vyaparId;
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    // Check if user has any Vyapar role for this Vyapar
    const hasVyaparRole = user.vyaparRoles && user.vyaparRoles.some(role => 
        role.vyaparId.toString() === vyaparId
    );
    if (!hasVyaparRole) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this business'
        });
    }
    next();
});

// Verify if user has sadhu role
const verifySadhuRole = asyncHandler(async (req, res, next) => {
    try {
        const { sadhuId } = req.params;
        const user = req.user;
        // If user is superadmin or admin, grant full access
        if (user.role === 'superadmin' || user.role === 'admin') {
            const sadhu = await Sadhu.findById(sadhuId);
            if (!sadhu) {
                return res.status(404).json({
                    success: false,
                    message: 'Sadhu not found'
                });
            }
            req.sadhu = sadhu;
            return next();
        }
        // Check if user has any role for this sadhu
        const hasSadhuRole = user.sadhuRoles && user.sadhuRoles.some(role => 
            role.sadhuId.toString() === sadhuId && 
            ['owner', 'manager', 'admin'].includes(role.role)
        );
        if (!hasSadhuRole) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to access this sadhu profile'
            });
        }
        
        const sadhu = await Sadhu.findById(sadhuId);
        if (!sadhu) {
            return res.status(404).json({
                success: false,
                message: 'Sadhu not found'
            });
        }
        
        req.sadhu = sadhu;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});


module.exports = {
    logMiddleware,
    authMiddleware,
    authenticate,
    isAdmin,
    isSuperAdmin,
    canReviewJainAadhar,
    checkAccess,
    verifySanghRole,
    verifySadhuRole,
    verifyVyaparRole,
    verifyTirthRole,
    verifyPanchRole
};