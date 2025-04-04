const mongoose = require('mongoose');
const config = require('../config/config');
const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const SanghAccess = require('../model/SanghModels/sanghAccessModel');
const User = require('../model/UserRegistrationModels/userModel');

// Connect to MongoDB
mongoose.connect(config.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected...');
    fixAreaLevelSanghs();
}).catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
});

async function fixAreaLevelSanghs() {
    try {
        console.log('Starting to fix area-level Sanghs...');
        
        // Find all area-level Sanghs
        const areaSanghs = await HierarchicalSangh.find({ 
            level: 'area', 
            status: 'active' 
        });
        
        console.log(`Found ${areaSanghs.length} area-level Sanghs`);
        
        let fixedSanghCount = 0;
        let fixedRolesCount = 0;
        
        for (const sangh of areaSanghs) {
            // Check if sangh has a valid sanghAccessId
            if (!sangh.sanghAccessId) {
                // Look for existing access
                let sanghAccess = await SanghAccess.findOne({ 
                    sanghId: sangh._id,
                    status: 'active'
                });
                
                // Create access if it doesn't exist
                if (!sanghAccess) {
                    sanghAccess = await SanghAccess.create({
                        sanghId: sangh._id,
                        level: 'area',
                        location: sangh.location,
                        createdBy: sangh.createdBy
                    });
                    console.log(`Created new access for Sangh: ${sangh.name}`);
                }
                
                // Update the Sangh with the access ID
                await HierarchicalSangh.findByIdAndUpdate(sangh._id, {
                    sanghAccessId: sanghAccess._id
                });
                
                console.log(`Fixed sanghAccessId for Sangh: ${sangh.name}`);
                fixedSanghCount++;
            }
            
            // Check and fix office bearer roles
            for (const bearer of sangh.officeBearers) {
                if (bearer.status === 'active') {
                    const user = await User.findById(bearer.userId);
                    
                    if (user) {
                        // Check if user has the correct role
                        const hasRole = user.sanghRoles.some(role => 
                            role.sanghId.toString() === sangh._id.toString() && 
                            role.role === bearer.role && 
                            role.level === 'area'
                        );
                        
                        if (!hasRole) {
                            // Add the missing role
                            await User.findByIdAndUpdate(user._id, {
                                $push: {
                                    sanghRoles: {
                                        sanghId: sangh._id,
                                        role: bearer.role,
                                        level: 'area'
                                    }
                                }
                            });
                            
                            console.log(`Added ${bearer.role} role for user ${user.name || user.firstName + ' ' + user.lastName} in Sangh: ${sangh.name}`);
                            fixedRolesCount++;
                        }
                    }
                }
            }
        }
        
        console.log('Fix completed:');
        console.log(`- Fixed ${fixedSanghCount} Sanghs with missing sanghAccessId`);
        console.log(`- Added ${fixedRolesCount} missing roles for office bearers`);
        
        mongoose.disconnect();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error fixing area-level Sanghs:', error);
        mongoose.disconnect();
        process.exit(1);
    }
} 