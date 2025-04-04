const asyncHandler = require('express-async-handler');
const User = require('../model/UserRegistrationModels/userModel');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Middleware to check if user has a specific role for an entity type
 * @param {string} entityType - The type of entity (sangh, panch, tirth, vyapar)
 * @param {string} role - The role to check for (president, secretary, treasurer, member, etc.)
 * @returns {Function} Express middleware
 */
const checkRole = (entityType, role) => asyncHandler(async (req, res, next) => {
    const user = req.user;
    
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    
    // Determine which role array to check based on entity type
    let roleArray;
    switch (entityType) {
        case 'sangh':
            roleArray = user.sanghRoles;
            break;
        case 'panch':
            roleArray = user.panchRoles;
            break;
        case 'tirth':
            roleArray = user.tirthRoles;
            break;
        case 'vyapar':
            roleArray = user.vyaparRoles;
            break;
        default:
            return errorResponse(res, 'Invalid entity type', 400);
    }
    
    // Get entity ID from request parameters
    const entityId = req.params[`${entityType}Id`] || req.params.id;
    
    if (!entityId) {
        return errorResponse(res, `${entityType} ID is required`, 400);
    }
    
    // Check if user has the specified role for the entity
    const hasRole = roleArray && roleArray.some(r => 
        r[`${entityType}Id`].toString() === entityId && 
        (role === 'any' || r.role === role)
    );
    
    if (!hasRole) {
        return errorResponse(res, `You do not have ${role} permission for this ${entityType}`, 403);
    }
    
    next();
});

/**
 * Middleware to check if user has any role for an entity
 * @param {string} entityType - The type of entity (sangh, panch, tirth, vyapar)
 * @param {string} entityId - The ID of the entity (optional, will use req.params if not provided)
 * @returns {Function} Express middleware
 */
const hasEntityAccess = (entityType, entityId = null) => asyncHandler(async (req, res, next) => {
    const user = req.user;
    
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    
    // Determine which role array to check based on entity type
    let roleArray;
    switch (entityType) {
        case 'sangh':
            roleArray = user.sanghRoles;
            break;
        case 'panch':
            roleArray = user.panchRoles;
            break;
        case 'tirth':
            roleArray = user.tirthRoles;
            break;
        case 'vyapar':
            roleArray = user.vyaparRoles;
            break;
        default:
            return errorResponse(res, 'Invalid entity type', 400);
    }
    
    // Get entity ID from parameters or from the function argument
    const targetEntityId = entityId || req.params[`${entityType}Id`] || req.params.id;
    
    if (!targetEntityId) {
        return errorResponse(res, `${entityType} ID is required`, 400);
    }
    
    // Check if user has any role for the entity
    const hasAccess = roleArray && roleArray.some(r => 
        r[`${entityType}Id`].toString() === targetEntityId
    );
    
    if (!hasAccess) {
        return errorResponse(res, `You do not have access to this ${entityType}`, 403);
    }
    
    next();
});

/**
 * Middleware to check if user is the owner of an entity
 * @param {string} entityType - The type of entity (sangh, panch, tirth, vyapar)
 * @param {string} entityId - The ID of the entity (optional, will use req.params if not provided)
 * @returns {Function} Express middleware
 */
const isEntityOwner = (entityType, entityId = null) => asyncHandler(async (req, res, next) => {
    const user = req.user;
    
    // If user is superadmin, grant full access
    if (user.role === 'superadmin' || user.role === 'admin') {
        return next();
    }
    
    // Get entity ID from parameters or from the function argument
    const targetEntityId = entityId || req.params[`${entityType}Id`] || req.params.id;
    
    if (!targetEntityId) {
        return errorResponse(res, `${entityType} ID is required`, 400);
    }
    
    // Get the entity model based on entity type
    let Entity;
    switch (entityType) {
        case 'tirth':
            Entity = require('../models/TirthModels/tirthModel');
            break;
        case 'vyapar':
            Entity = require('../models/VyaparModels/vyaparModel');
            break;
        case 'panch':
            Entity = require('../models/SanghModels/panchModel');
            break;
        default:
            return errorResponse(res, 'Invalid entity type or ownership check not supported for this entity', 400);
    }
    
    // Find the entity
    const entity = await Entity.findById(targetEntityId);
    
    if (!entity) {
        return errorResponse(res, `${entityType} not found`, 404);
    }
    
    // Check if user is the owner
    const isOwner = entity.ownerId && entity.ownerId.toString() === user._id.toString();
    
    if (!isOwner) {
        return errorResponse(res, `You are not the owner of this ${entityType}`, 403);
    }
    
    // Add entity to request for use in controller
    req[entityType] = entity;
    next();
});

module.exports = {
    checkRole,
    hasEntityAccess,
    isEntityOwner
};
