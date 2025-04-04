const User = require('../model/UserRegistrationModels/userModel');
const mongoose = require('mongoose');

/**
 * Service to manage user roles
 */
class UserRoleService {
    /**
     * Add a role to a user
     * @param {string} userId - The user ID
     * @param {string} entityType - The type of entity (sangh, panch, tirth, vyapar, sadhu)
     * @param {string} entityId - The ID of the entity
     * @param {string} role - The role to add (president, secretary, treasurer, member, etc.)
     * @param {object} additionalData - Any additional data to store with the role
     * @returns {Promise<object>} The updated user
     */
    static async addRole(userId, entityType, entityId, role, additionalData = {}) {
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(entityId)) {
            throw new Error('Invalid user ID or entity ID');
        }

        // Determine which role array to update based on entity type
        let roleField;
        switch (entityType) {
            case 'sangh':
                roleField = 'sanghRoles';
                break;
            case 'panch':
                roleField = 'panchRoles';
                break;
            case 'tirth':
                roleField = 'tirthRoles';
                break;
            case 'vyapar':
                roleField = 'vyaparRoles';
                break;
            case 'sadhu':
                roleField = 'sadhuRoles';
                break;
            default:
                throw new Error('Invalid entity type');
        }

        // Create the role object
        const roleObject = {
            [`${entityType}Id`]: entityId,
            role,
            ...additionalData,
            addedAt: new Date()
        };

        // Check if user already has this role
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if the role already exists
        const roleExists = user[roleField] && user[roleField].some(r => 
            r[`${entityType}Id`].toString() === entityId && r.role === role
        );

        if (roleExists) {
            // Role already exists, return the user without changes
            return user;
        }

        // Add the role to the user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $push: { [roleField]: roleObject } },
            { new: true }
        );

        return updatedUser;
    }

    /**
     * Remove a role from a user
     * @param {string} userId - The user ID
     * @param {string} entityType - The type of entity (sangh, panch, tirth, vyapar)
     * @param {string} entityId - The ID of the entity
     * @param {string} role - The role to remove (optional, if not provided, all roles for the entity will be removed)
     * @returns {Promise<object>} The updated user
     */
    static async removeRole(userId, entityType, entityId, role = null) {
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(entityId)) {
            throw new Error('Invalid user ID or entity ID');
        }

        // Determine which role array to update based on entity type
        let roleField;
        switch (entityType) {
            case 'sangh':
                roleField = 'sanghRoles';
                break;
            case 'panch':
                roleField = 'panchRoles';
                break;
            case 'tirth':
                roleField = 'tirthRoles';
                break;
            case 'vyapar':
                roleField = 'vyaparRoles';
                break;
            default:
                throw new Error('Invalid entity type');
        }

        // Create the pull condition
        const pullCondition = {
            [`${entityType}Id`]: entityId
        };

        // If role is specified, add it to the condition
        if (role) {
            pullCondition.role = role;
        }

        // Remove the role(s) from the user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { [roleField]: pullCondition } },
            { new: true }
        );

        if (!updatedUser) {
            throw new Error('User not found');
        }

        return updatedUser;
    }

    /**
     * Get all roles for a user
     * @param {string} userId - The user ID
     * @returns {Promise<object>} The user's roles
     */
    static async getUserRoles(userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }

        const user = await User.findById(userId)
            .select('sanghRoles panchRoles tirthRoles vyaparRoles sadhuRoles')
            .lean();

        if (!user) {
            throw new Error('User not found');
        }

        return {
            sanghRoles: user.sanghRoles || [],
            panchRoles: user.panchRoles || [],
            tirthRoles: user.tirthRoles || [],
            vyaparRoles: user.vyaparRoles || [],
            sadhuRoles: user.sadhuRoles || []
        };
    }

    /**
     * Check if a user has a specific role
     * @param {string} userId - The user ID
     * @param {string} entityType - The type of entity (sangh, panch, tirth, vyapar, sadhu)
     * @param {string} entityId - The ID of the entity
     * @param {string} role - The role to check for (optional, if not provided, checks for any role)
     * @returns {Promise<boolean>} Whether the user has the role
     */
    static async hasRole(userId, entityType, entityId, role = null) {
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(entityId)) {
            throw new Error('Invalid user ID or entity ID');
        }

        // Determine which role array to check based on entity type
        let roleField;
        switch (entityType) {
            case 'sangh':
                roleField = 'sanghRoles';
                break;
            case 'panch':
                roleField = 'panchRoles';
                break;
            case 'tirth':
                roleField = 'tirthRoles';
                break;
            case 'vyapar':
                roleField = 'vyaparRoles';
                break;
            case 'sadhu':
                roleField = 'sadhuRoles';
                break;
            default:
                throw new Error('Invalid entity type');
        }

        // Create the query
        const query = {
            _id: userId,
            [`${roleField}.${entityType}Id`]: entityId
        };

        // If role is specified, add it to the query
        if (role) {
            query[`${roleField}.role`] = role;
        }

        // Check if user has the role
        const user = await User.findOne(query);

        return !!user;
    }
}

module.exports = UserRoleService;
