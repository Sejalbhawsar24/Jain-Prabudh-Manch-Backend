/**
 * Migration script to convert existing credential-based access to role-based access
 * Run this script once to migrate all existing data
 */

const mongoose = require('mongoose');
const User = require('../model/UserRegistrationModels/userModel');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const Panch = require('../model/SanghModels/panchModel');
const Tirth = require('../model/TirthModels/tirthModel');
const Vyapar = require('../model/VyaparModels/vyaparModel');
const UserRoleService = require('../services/userRoleService');
const config = require('../config/config');

// Connect to MongoDB
mongoose.connect(config.mongoURI)
    .then(() => console.log('MongoDB connected for migration'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

/**
 * Migrate Tirth credentials to roles
 */
const migrateTirthCredentials = async () => {
    console.log('Starting Tirth credentials migration...');
    
    try {
        // Get all Tirth entities with credentials
        const tirths = await Tirth.find({ 
            status: 'approved',
            accessId: { $exists: true, $ne: null },
            accessKey: { $exists: true, $ne: null }
        }).populate('ownerId');
        
        console.log(`Found ${tirths.length} Tirth entities with credentials to migrate`);
        
        // For each Tirth, add roles to the owner
        for (const tirth of tirths) {
            if (tirth.ownerId) {
                try {
                    await UserRoleService.addRole(
                        tirth.ownerId._id,
                        'tirth',
                        tirth._id,
                        'owner',
                        { 
                            name: tirth.name,
                            location: tirth.location
                        }
                    );
                    console.log(`Added tirth role for user ${tirth.ownerId._id} and tirth ${tirth._id}`);
                    
                    // Remove credentials from Tirth entity
                    tirth.accessId = undefined;
                    tirth.accessKey = undefined;
                    await tirth.save();
                    
                    console.log(`Removed credentials from tirth ${tirth._id}`);
                } catch (error) {
                    console.error(`Error adding tirth role for user ${tirth.ownerId._id} and tirth ${tirth._id}:`, error);
                }
            } else {
                console.log(`Tirth ${tirth._id} has no owner, skipping`);
            }
        }
        
        console.log('Tirth credentials migration completed');
    } catch (error) {
        console.error('Error migrating Tirth credentials:', error);
    }
};

/**
 * Migrate Vyapar credentials to roles
 */
const migrateVyaparCredentials = async () => {
    console.log('Starting Vyapar credentials migration...');
    
    try {
        // Get all Vyapar entities with credentials
        const vyapars = await Vyapar.find({ 
            status: 'approved',
            accessId: { $exists: true, $ne: null },
            accessKey: { $exists: true, $ne: null }
        }).populate('ownerId');
        
        console.log(`Found ${vyapars.length} Vyapar entities with credentials to migrate`);
        
        // For each Vyapar, add roles to the owner
        for (const vyapar of vyapars) {
            if (vyapar.ownerId) {
                try {
                    await UserRoleService.addRole(
                        vyapar.ownerId._id,
                        'vyapar',
                        vyapar._id,
                        'owner',
                        { 
                            businessName: vyapar.businessName,
                            location: vyapar.location
                        }
                    );
                    
                    console.log(`Added vyapar role for user ${vyapar.ownerId._id} and vyapar ${vyapar._id}`);
                    
                    // Remove credentials from Vyapar entity
                    vyapar.accessId = undefined;
                    vyapar.accessKey = undefined;
                    await vyapar.save();
                    
                    console.log(`Removed credentials from vyapar ${vyapar._id}`);
                } catch (error) {
                    console.error(`Error adding vyapar role for user ${vyapar.ownerId._id} and vyapar ${vyapar._id}:`, error);
                }
            } else {
                console.log(`Vyapar ${vyapar._id} has no owner, skipping`);
            }
        }
        
        console.log('Vyapar credentials migration completed');
    } catch (error) {
        console.error('Error migrating Vyapar credentials:', error);
    }
};

/**
 * Migrate Panch credentials to roles
 */
const migratePanchCredentials = async () => {
    console.log('Starting Panch credentials migration...');
    
    try {
        // Get all Panch entities
        const panchGroups = await Panch.find().populate('members.userId');
        
        console.log(`Found ${panchGroups.length} Panch groups to migrate`);
        
        // For each Panch group, add roles to the members
        for (const panchGroup of panchGroups) {
            for (const member of panchGroup.members) {
                if (member.userId) {
                    try {
                        await UserRoleService.addRole(
                            member.userId._id,
                            'panch',
                            panchGroup._id,
                            member.role || 'member',
                            { 
                                sanghId: panchGroup.sanghId,
                                status: member.status
                            }
                        );
                        
                        console.log(`Added panch role for user ${member.userId._id} and panch ${panchGroup._id}`);
                        
                        // Remove credentials from member if they exist
                        if (member.accessId || member.accessKey) {
                            member.accessId = undefined;
                            member.accessKey = undefined;
                        }
                    } catch (error) {
                        console.error(`Error adding panch role for user ${member.userId._id} and panch ${panchGroup._id}:`, error);
                    }
                } else {
                    console.log(`Panch member in group ${panchGroup._id} has no user ID, skipping`);
                }
            }
            
            // Save the panch group with updated members
            await panchGroup.save();
            console.log(`Updated panch group ${panchGroup._id}`);
        }
        
        console.log('Panch credentials migration completed');
    } catch (error) {
        console.error('Error migrating Panch credentials:', error);
    }
};

/**
 * Migrate Sangh office bearers to roles
 */
const migrateSanghOfficeBearers = async () => {
    console.log('Starting Sangh office bearers migration...');
    
    try {
        // Get all Hierarchical Sangh entities
        const sanghs = await HierarchicalSangh.find().populate('officeBearers.userId');
        
        console.log(`Found ${sanghs.length} Sangh entities to migrate`);
        
        // For each Sangh, add roles to the office bearers
        for (const sangh of sanghs) {
            for (const officeBearer of sangh.officeBearers) {
                if (officeBearer.userId && officeBearer.status === 'active') {
                    try {
                        await UserRoleService.addRole(
                            officeBearer.userId._id,
                            'sangh',
                            sangh._id,
                            officeBearer.role,
                            { 
                                level: sangh.level,
                                name: sangh.name,
                                location: sangh.location,
                                term: {
                                    startDate: officeBearer.term.startDate,
                                    endDate: officeBearer.term.endDate
                                }
                            }
                        );
                        
                        console.log(`Added sangh role for user ${officeBearer.userId._id} and sangh ${sangh._id}`);
                    } catch (error) {
                        console.error(`Error adding sangh role for user ${officeBearer.userId._id} and sangh ${sangh._id}:`, error);
                    }
                } else {
                    console.log(`Office bearer in sangh ${sangh._id} has no user ID or is not active, skipping`);
                }
            }
        }
        
        console.log('Sangh office bearers migration completed');
    } catch (error) {
        console.error('Error migrating Sangh office bearers:', error);
    }
};

/**
 * Main migration function
 */
const migrateCredentialsToRoles = async () => {
    console.log('Starting credentials to roles migration...');
    
    try {
        // Migrate Tirth credentials
        await migrateTirthCredentials();
        
        // Migrate Vyapar credentials
        await migrateVyaparCredentials();
        
        // Migrate Panch credentials
        await migratePanchCredentials();
        
        // Migrate Sangh office bearers
        await migrateSanghOfficeBearers();
        
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
};

/**
 * Update existing users to ensure they have the necessary role arrays
 */
const updateExistingUsers = async () => {
    console.log('Starting user update...');
    
    try {
        // Update all users to ensure they have the role arrays
        const result = await User.updateMany(
            { 
                $or: [
                    { sanghRoles: { $exists: false } },
                    { panchRoles: { $exists: false } },
                    { tirthRoles: { $exists: false } },
                    { vyaparRoles: { $exists: false } }
                ]
            },
            { 
                $set: { 
                    sanghRoles: [], 
                    panchRoles: [], 
                    tirthRoles: [], 
                    vyaparRoles: [] 
                } 
            }
        );
        
        console.log(`Updated ${result.modifiedCount} users`);
        console.log('User update completed successfully');
    } catch (error) {
        console.error('User update failed:', error);
    }
};

// Run the migration
const runMigration = async () => {
    try {
        // First update existing users
        await updateExistingUsers();
        
        // Then migrate credentials to roles
        await migrateCredentialsToRoles();
        
        process.exit(0);
    } catch (error) {
        console.error('Migration script failed:', error);
        process.exit(1);
    }
};

// Run the migration if this script is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = {
    migrateCredentialsToRoles,
    updateExistingUsers,
    runMigration
};
