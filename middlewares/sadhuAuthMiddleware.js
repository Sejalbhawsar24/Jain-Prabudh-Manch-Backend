const Sadhu = require('../model/SadhuModels/sadhuModel');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const { errorResponse } = require('../utils/apiResponse');
const UserRoleService = require('../services/userRoleService');

// Verify sadhu using JWT token and role
const verifySadhuCredentials = async (req, res, next) => {
    try {
        const { sadhuId } = req.params;
        const userId = req.user._id;

        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            const sadhu = await Sadhu.findById(sadhuId);
            if (!sadhu) {
                return errorResponse(res, 'Sadhu not found', 404);
            }
            req.sadhu = sadhu;
            return next();
        }

        // Check if user has owner role for this sadhu
        const hasSadhuRole = req.user.sadhuRoles && req.user.sadhuRoles.some(role => 
            role.sadhuId.toString() === sadhuId && role.role === 'owner'
        );

        if (!hasSadhuRole) {
            return errorResponse(res, 'You do not have permission to access this sadhu profile', 403);
        }

        const sadhu = await Sadhu.findById(sadhuId);
        if (!sadhu) {
            return errorResponse(res, 'Sadhu not found', 404);
        }

        req.sadhu = sadhu;
        next();
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Check if user is city president for review
const isCityPresident = async (req, res, next) => {
    try {
        let citySanghId;
        
        // For review endpoint, first get the sadhu details
        if (req.params.sadhuId) {
            const sadhu = await Sadhu.findById(req.params.sadhuId);
            if (!sadhu) {
                return errorResponse(res, 'Sadhu not found', 404);
            }
            citySanghId = sadhu.citySanghId;
            req.sadhu = sadhu;
        } else {
            // For pending applications endpoint
            citySanghId = req.params.citySanghId;
        }

        if (!citySanghId) {
            return errorResponse(res, 'City Sangh ID is required', 400);
        }
        
        // If user is superadmin, grant full access
        if (req.user.role === 'superadmin' || req.user.role === 'admin') {
            // Get the city Sangh for additional context if needed
            const citySangh = await HierarchicalSangh.findOne({
                _id: citySanghId,
                level: 'city'
            });
            
            if (!citySangh) {
                return errorResponse(res, 'City Sangh not found', 404);
            }
            
            req.citySangh = citySangh;
            return next();
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

const canManageSadhuPost = async (req, res, next) => {
    try {
      const { sadhuId } = req.params;
      const userId = req.user._id;
  
      console.log("🔹 Sadhu ID from params:", sadhuId);
      console.log("🔹 User ID:", userId);
      console.log("🔹 User Roles:", JSON.stringify(req.user.sadhuRoles, null, 2));
  
      if (!sadhuId) {
        return errorResponse(res, "Sadhu ID is missing in request", 400);
      }
  
      // 🛠 Convert ObjectId to String before comparison
      const hasSadhuRole = req.user.sadhuRoles?.some(role => {
        console.log(`Checking Role: ${role.sadhuId.toString()} === ${sadhuId.toString()}`);
        return role.sadhuId.toString() === sadhuId.toString() &&
               ["owner", "manager", "admin"].includes(role.role);
      });
  
      console.log("🔹 Has Sadhu Role:", hasSadhuRole);
  
      if (!hasSadhuRole) {
        return errorResponse(res, "Unauthorized: Only sadhu managers can perform this action", 403);
      }
  
      const sadhu = await Sadhu.findOne({
        _id: sadhuId,
        applicationStatus: "approved",
       // status: "active",
      });
  
      if (!sadhu) {
        return errorResponse(res, "Sadhu not found or inactive", 404);
      }
  
      console.log("✅ Sadhu found and active");
      req.sadhu = sadhu;
      next();
    } catch (error) {
      console.error("🚨 Middleware Error:", error);
      return errorResponse(res, error.message, 500);
    }
  };
  

module.exports = {
    verifySadhuCredentials,
    isCityPresident,
    canManageSadhuPost
};
