const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const asyncHandler = require('express-async-handler');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');

// Helper Functions
const formatFullName = (firstName, lastName) => {
    return lastName.toLowerCase() === 'jain' 
        ? `${firstName} Jain`
        : `${firstName} Jain (${lastName})`;
};

const validateOfficeBearers = async (officeBearers) => {
    for (const role of ['president', 'secretary', 'treasurer']) {
        const user = await User.findOne({
            jainAadharNumber: officeBearers[role].jainAadharNumber,
            jainAadharStatus: 'verified'
        });

        if (!user) {
            throw new Error(`${role}'s Jain Aadhar is not verified`);
        }

        // Check if user is already an office bearer in another active Sangh
        const existingSangh = await HierarchicalSangh.findOne({
            'officeBearers': {
                $elemMatch: {
                    'userId': user._id,
                    'status': 'active'
                }
            },
            'status': 'active'
        });

        if (existingSangh) {
            throw new Error(`${role} is already an office bearer in another Sangh`);
        }
    }
};
// Create new Sangh
const createHierarchicalSangh = asyncHandler(async (req, res) => {
    try {
        const {
            name,
            level,
            location,
            officeBearers,
            parentSanghId,
            contact,
            establishedDate,
            description,
            socialMedia,
            parentSanghAccessId,
            sanghType = 'main'
        } = req.body;
        // console.log("parentSanghId in request:", req.body);
        // console.log("Received parentSanghId:", req.body.parentSanghId);

         // Validate required fields
        if (!name || !level || !location || !officeBearers) {
            return errorResponse(res, 'Missing required fields', 400);
        }
        // Validate sanghType
        if (!['main', 'women', 'youth'].includes(sanghType)) {
            return errorResponse(res, 'Invalid Sangh type. Must be "main", "women", or "youth"', 400);
        }
         // If creating a specialized Sangh, ensure it inherits the type from parent
         let resolvedSanghType = sanghType;
         let parentMainSanghId = null;
 
         if (parentSanghId) {
             const parentSangh = await HierarchicalSangh.findById(parentSanghId);
             if (!parentSangh) {
                 return errorResponse(res, 'Parent Sangh not found', 404);
             }
 
             // If parent is specialized, child must be the same type
             if (parentSangh.sanghType !== 'main') {
                 resolvedSanghType = parentSangh.sanghType;
             }
 
             // Track the top-level main Sangh for specialized Sanghs
             if (resolvedSanghType !== 'main') {
                 parentMainSanghId = parentSangh.parentMainSangh || parentSangh._id;
             }
         }
         // Validate office bearers
         if (!officeBearers.president || !officeBearers.secretary || !officeBearers.treasurer) {
             return errorResponse(res, 'All office bearer details are required', 400);
         }
         const formattedOfficeBearers = await Promise.all(['president', 'secretary', 'treasurer'].map(async role => {
            const user = await User.findOne({ jainAadharNumber: officeBearers[role].jainAadharNumber });
            return {
                role,
                userId: user ? user._id : null,  // Ensure user exists
                firstName: officeBearers[role]?.firstName || "",
                lastName: officeBearers[role]?.lastName || "",
                name: formatFullName(officeBearers[role]?.firstName || "", officeBearers[role]?.lastName || ""),
                jainAadharNumber: officeBearers[role]?.jainAadharNumber || "",
                mobileNumber: officeBearers[role]?.mobileNumber || "",
                document: req.files[`${role}JainAadhar`] ? req.files[`${role}JainAadhar`][0].location : null,
                photo: req.files[`${role}Photo`] ? req.files[`${role}Photo`][0].location : null
            };
        }));
        // Validate location hierarchy based on level
        if (level === 'area' && (!location.country || !location.state || !location.district || !location.city || !location.area)) {
            return errorResponse(res, 'Area level Sangh requires complete location hierarchy (country, state, district, city, area)', 400);
        }

        // Additional area-specific validation
        if (level === 'area') {
            const existingAreaSangh = await HierarchicalSangh.findOne({
                level: 'area',
                'location.country': location.country,
                'location.state': location.state,
                'location.district': location.district,
                'location.city': location.city,
                'location.area': location.area,
                status: 'active'
            });
            if (existingAreaSangh) {
                return errorResponse(res, 'An active Sangh already exists for this area', 400);
            }
        }
        // Validate required documents
        if (!req.files) {
            return errorResponse(res, 'Office bearer documents are required', 400);
        }

        const requiredDocs = [
            'presidentJainAadhar',
            'presidentPhoto',
            'secretaryJainAadhar',
            'secretaryPhoto',
            'treasurerJainAadhar',
            'treasurerPhoto'
        ];
        // const missingDocs = requiredDocs.filter(doc => !req.files[doc]);
        // if (missingDocs.length > 0) {
        //     return errorResponse(res, `Missing required documents: ${missingDocs.join(', ')}`, 400);
        // }
        // Validate office bearers
       // await validateOfficeBearers(officeBearers);
      
        // Validate hierarchy level before creation
        const parentSangh = parentSanghId ? await HierarchicalSangh.findById(parentSanghId) : null;
        if (parentSangh) {
            const levelHierarchy = ['country', 'state', 'district', 'city', 'area'];
            const parentIndex = levelHierarchy.indexOf(parentSangh.level);
            const currentIndex = levelHierarchy.indexOf(level);
            
            if (currentIndex <= parentIndex || currentIndex - parentIndex > 1) {
                return errorResponse(res, `Invalid hierarchy: ${level} level cannot be directly under ${parentSangh.level} level`, 400);
            }
        }

        // Create Sangh
        const sangh = await HierarchicalSangh.create({
            name,
            level,
            location,
            parentSangh: parentSanghId,
            officeBearers: formattedOfficeBearers,
            description,
            contact,
            socialMedia,
            sanghType: resolvedSanghType,
            parentMainSangh: parentMainSanghId,
            createdBy: req.user._id
        });
        // console.log("Saved Sangh:", sangh);
        // console.log("Assigning parentSangh:", parentSanghId);
        // console.log("Assigning parentMainSangh:", parentMainSanghId);
        // Validate hierarchy
        await sangh.validateHierarchy();
        // Update office bearer roles in User model
        for (const bearer of formattedOfficeBearers) {
            await User.findByIdAndUpdate(bearer.userId, {
                $push: {
                    sanghRoles: {
                        sanghId: sangh._id,
                        role: bearer.role,
                        level: level,
                        sanghType: resolvedSanghType
                    }
                }
            });
        }
        // Automatically create SanghAccess entry
        const SanghAccess = require('../../model/SanghModels/sanghAccessModel');
        const mongoose = require('mongoose');
        // Check if access already exists
        const existingAccess = await SanghAccess.findOne({ 
            sanghId: sangh._id,
            status: 'active'
        });
        
        let sanghAccess;
        let resolvedParentSanghAccessId = null;
        
        // Resolve parentSanghAccessId if provided
        if (parentSanghAccessId) {
            if (mongoose.Types.ObjectId.isValid(parentSanghAccessId)) {
                // It's already a valid ObjectId
                resolvedParentSanghAccessId = parentSanghAccessId;
            } else {
                // It might be an access code string
                const parentAccess = await SanghAccess.findOne({ 
                    accessId: parentSanghAccessId,
                    status: 'active'
                });
                
                if (parentAccess) {
                    resolvedParentSanghAccessId = parentAccess._id;
                }
            }
        }
        if (!existingAccess) {
            // Create new Sangh access
            sanghAccess = await SanghAccess.create({
                sanghId: sangh._id,
                level,
                location,
                createdBy: req.user._id,
                parentSanghAccess: resolvedParentSanghAccessId
            });
            // Update the Sangh with the sanghAccessId
            await HierarchicalSangh.findByIdAndUpdate(sangh._id, {
                sanghAccessId: sanghAccess._id
            });
            // Update the local sangh object for response
            sangh.sanghAccessId = sanghAccess._id;
            return successResponse(res, {
                sangh,
                accessId: sangh.accessId,
                sanghAccessId: sanghAccess._id,
                sanghAccessCode: sanghAccess.accessId
            }, 'Sangh created successfully with access', 201);
        } else {
            // If access already exists, ensure sanghAccessId is set
            if (!sangh.sanghAccessId) {
                await HierarchicalSangh.findByIdAndUpdate(sangh._id, {
                    sanghAccessId: existingAccess._id
                });
                sangh.sanghAccessId = existingAccess._id;
            }
            return successResponse(res, {
                sangh,
                accessId: sangh.accessId,
                sanghAccessId: existingAccess._id,
                sanghAccessCode: existingAccess.accessId
            }, 'Sangh created successfully with existing access', 201);
        }

    } catch (error) {
        if (req.files) {
            await deleteS3Files(req.files);
        }
        return errorResponse(res, error.message, 500);
    }
});

// Get All Sangh
const getAllSangh = asyncHandler(async (req, res) => {
    try {
        const sanghs = await HierarchicalSangh.find();
        if (!sanghs.length) {
            return errorResponse(res, 'No Sangh found', 404);
        }
        return successResponse(res, sanghs, 'All Sangh retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});
const getAllSanghs = asyncHandler(async (req, res) => {
    try {
        const { query } = req.query; // Fetch the query from request

        // If there's a search query, filter based on the query in name or location (country, state, etc.)
        const searchCriteria = query
            ? {
                  $or: [
                      { name: { $regex: query, $options: 'i' } }, // Match name with case insensitive regex
                      { 'location.country': { $regex: query, $options: 'i' } }, // Match country
                      { 'location.state': { $regex: query, $options: 'i' } }, // Match state
                      { 'location.district': { $regex: query, $options: 'i' } }, // Match district
                      { 'location.city': { $regex: query, $options: 'i' } }, // Match city
                      { 'location.area': { $regex: query, $options: 'i' } } // Match area
                  ]
              }
            : {}; // If no query, return all

        const sanghs = await HierarchicalSangh.find(searchCriteria);

        if (!sanghs.length) {
            return errorResponse(res, 'No Sangh found', 404);
        }

        // Sort the Sanghs to bring matching results first
        sanghs.sort((a, b) => {
            const queryLower = query ? query.toLowerCase() : ''; // Lowercased query for comparison

            // Check if 'a' or 'b' has relevant fields to search
            const aMatch =
                (a.name && a.name.toLowerCase().includes(queryLower)) ||
                (a.location && a.location.country && a.location.country.toLowerCase().includes(queryLower)) ||
                (a.location && a.location.state && a.location.state.toLowerCase().includes(queryLower)) ||
                (a.location && a.location.district && a.location.district.toLowerCase().includes(queryLower)) ||
                (a.location && a.location.city && a.location.city.toLowerCase().includes(queryLower)) ||
                (a.location && a.location.area && a.location.area.toLowerCase().includes(queryLower));

            const bMatch =
                (b.name && b.name.toLowerCase().includes(queryLower)) ||
                (b.location && b.location.country && b.location.country.toLowerCase().includes(queryLower)) ||
                (b.location && b.location.state && b.location.state.toLowerCase().includes(queryLower)) ||
                (b.location && b.location.district && b.location.district.toLowerCase().includes(queryLower)) ||
                (b.location && b.location.city && b.location.city.toLowerCase().includes(queryLower)) ||
                (b.location && b.location.area && b.location.area.toLowerCase().includes(queryLower));

            // Prioritize matches
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
        });

        return successResponse(res, sanghs, 'All Sangh retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get Sangh hierarchy
const getHierarchy = asyncHandler(async (req, res) => {
    try {
        const sangh = await HierarchicalSangh.findById(req.params.id);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }
        const hierarchy = await sangh.getHierarchy();
        return successResponse(res, hierarchy, 'Hierarchy retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get Sanghs by level and location
const getSanghsByLevelAndLocation = asyncHandler(async (req, res) => {
    try {
        const { level, country, state, district, city, page = 1, limit = 10 } = req.query;
        const query = { status: 'active' };
        if (level) query.level = level;
        if (country) query['location.country'] = country;
        if (state) query['location.state'] = state;
        if (district) query['location.district'] = district;
        if (city) query['location.city'] = city;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const sanghs = await HierarchicalSangh.find(query)
            .populate('parentSangh', 'name level location')
            .populate('officeBearers.userId', 'name email phoneNumber')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await HierarchicalSangh.countDocuments(query);

        return successResponse(res, {
            sanghs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        }, 'Sanghs retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get child Sanghs
const getChildSanghs = asyncHandler(async (req, res) => {
    try {
        const sangh = await HierarchicalSangh.findById(req.params.id);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        const children = await sangh.getChildSanghs();
        return successResponse(res, children, 'Child Sanghs retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Update Sangh
const updateHierarchicalSangh = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const sangh = await HierarchicalSangh.findById(id);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        // Validate user's permission
        const userRole = req.user.sanghRoles.find(role => 
            role.sanghId.toString() === id && 
            ['president', 'secretary'].includes(role.role)
        );

        if (!userRole && req.user.role !== 'superadmin') {
            return errorResponse(res, 'Not authorized to update this Sangh', 403);
        }

         // Handle document updates if files are provided
         if (req.files) {
            for (const role of ['president', 'secretary', 'treasurer']) {
                if (req.files[`${role}JainAadhar`]) {
                    const bearer = sangh.officeBearers.find(b => b.role === role);
                    if (bearer?.document) {
                        await deleteS3File(bearer.document);
                    }
                    updates[`officeBearers.$[elem].document`] = req.files[`${role}JainAadhar`][0].location;
                }
                if (req.files[`${role}Photo`]) {
                    const bearer = sangh.officeBearers.find(b => b.role === role);
                    if (bearer?.photo) {
                        await deleteS3File(bearer.photo);
                    }
                    updates[`officeBearers.$[elem].photo`] = req.files[`${role}Photo`][0].location;
                }
            }
        }
        const updatedSangh = await HierarchicalSangh.findByIdAndUpdate(
            id,
            { $set: updates },
            { 
                new: true, 
                runValidators: true,
                arrayFilters: [{ 'elem.status': 'active' }]
            }
        ).populate('officeBearers.userId', 'name email phoneNumber');
        return successResponse(res, updatedSangh, 'Sangh updated successfully');
    } catch (error) {
        if (req.files) {
            await deleteS3Files(req.files);
        }
        return errorResponse(res, error.message, 500);
    }
});

// Helper function to delete S3 file
const deleteS3File = async (fileUrl) => {
    try {
        const key = extractS3KeyFromUrl(fileUrl);
        if (key) {
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            };
            await s3Client.send(new DeleteObjectCommand(deleteParams));
        }
    } catch (error) {
        console.error(`Error deleting file from S3: ${fileUrl}`, error);
    }
};

// Helper function to delete multiple S3 files
const deleteS3Files = async (files) => {
    const deletePromises = [];
    for (const [role, roleFiles] of Object.entries(files)) {
        if (Array.isArray(roleFiles)) {
            roleFiles.forEach(file => {
                if (file.location) {
                    deletePromises.push(deleteS3File(file.location));
                }
            });
        }
    }
    await Promise.all(deletePromises);
};

// Check office bearer terms
const checkOfficeBearerTerms = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;

        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        const currentDate = new Date();
        const expiredBearers = sangh.officeBearers.filter(bearer => 
            bearer.status === 'active' && bearer.termEndDate < currentDate
        );

        if (expiredBearers.length > 0) {
            // Mark expired bearers as inactive
            await HierarchicalSangh.updateOne(
                { _id: sanghId },
                { 
                    $set: {
                        'officeBearers.$[elem].status': 'inactive'
                    }
                },
                {
                    arrayFilters: [{ 
                        'elem.status': 'active',
                        'elem.termEndDate': { $lt: currentDate }
                    }]
                }
            );

            return successResponse(res, {
                message: 'Office bearer terms checked',
                expiredBearers: expiredBearers.map(b => ({
                    role: b.role,
                    name: b.name,
                    termEndDate: b.termEndDate
                }))
            });
        }

        return successResponse(res, {
            message: 'No expired terms found'
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Add member(s) to Sangh
const addSanghMember = asyncHandler(async (req, res) => {
    try {
        const sangh = req.sangh;
        const MAX_BULK_MEMBERS = 50;
        if (sangh) {
            console.log('Sangh type:', sangh.sanghType);
            console.log('Sangh name:', sangh.name);
        }
        if (sangh && !sangh.save) {
            sangh = await HierarchicalSangh.findById(sangh._id);
            if (!sangh) {
                return errorResponse(res, 'Sangh not found', 404);
            }
        }
        // Check if it's a bulk operation or single member addition
        const isBulkOperation = req.body.members && Array.isArray(req.body.members);
        
        if (isBulkOperation) {
            const { members } = req.body;
            
            if (members.length === 0) {
                return errorResponse(res, 'Members array cannot be empty', 400);
            }

            if (members.length > MAX_BULK_MEMBERS) {
                return errorResponse(res, `Cannot add more than ${MAX_BULK_MEMBERS} members at once`, 400);
            }
            
            const results = {
                success: [],
                failed: []
            };

            // Validate all members first
            for (const member of members) {
                if (!member.firstName || !member.lastName || !member.jainAadharNumber) {
                    results.failed.push({
                        jainAadharNumber: member.jainAadharNumber || 'unknown',
                        reason: 'Missing required fields'
                    });
                    continue;
                }

                try {
                    const user = await User.findOne({ 
                        jainAadharNumber: member.jainAadharNumber, 
                        jainAadharStatus: 'verified' 
                    });

                    if (!user) {
                        results.failed.push({
                            jainAadharNumber: member.jainAadharNumber,
                            reason: 'Invalid or unverified Jain Aadhar number'
                        });
                        continue;
                    }

                    if (sangh.members.some(m => m.jainAadharNumber === member.jainAadharNumber)) {
                        results.failed.push({
                            jainAadharNumber: member.jainAadharNumber,
                            reason: 'Already a member of this Sangh'
                        });
                        continue;
                    }

                    const newMember = {
                        userId: user._id,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        name: formatFullName(member.firstName, member.lastName),
                        jainAadharNumber: member.jainAadharNumber,
                        email: member.email || user.email,
                        phoneNumber: member.phoneNumber || user.phoneNumber,
                        address: {
                            ...member.address,
                            city: member.address?.city || user.city,
                            district: member.address?.district || user.district,
                            state: member.address?.state || user.state
                        },
                        addedBy: req.user._id,
                        addedAt: new Date(),
                        status: 'active'
                    };

                    sangh.members.push(newMember);
                    results.success.push({
                        jainAadharNumber: member.jainAadharNumber,
                        name: newMember.name
                    });

                    // Update user's Sangh roles
                    await User.findByIdAndUpdate(user._id, {
                        $push: {
                            sanghRoles: {
                                sanghId: sangh._id,
                                role: 'member',
                                level: sangh.level,
                                sanghType: sangh.sanghType || 'main',
                                addedAt: new Date()
                            }
                        }
                    });
                } catch (error) {
                    results.failed.push({
                        jainAadharNumber: member.jainAadharNumber,
                        reason: error.message
                    });
                }
            }

            if (results.success.length > 0) {
                await sangh.save();
            }

            return successResponse(res, {
                sangh: {
                    _id: sangh._id,
                    name: sangh.name,
                    level: sangh.level,
                    totalMembers: sangh.members.length
                },
                results
            }, `Added ${results.success.length} members successfully, ${results.failed.length} failed`);
        } 
        else {
            const { firstName, lastName, jainAadharNumber, email, phoneNumber, address } = req.body;

            if (!firstName || !lastName || !jainAadharNumber) {
                return errorResponse(res, 'Missing required fields', 400);
            }

            const user = await User.findOne({ 
                jainAadharNumber, 
                jainAadharStatus: 'verified' 
            });

            if (!user) {
                return errorResponse(res, 'Invalid or unverified Jain Aadhar number', 400);
            }

            if (sangh.members.some(m => m.jainAadharNumber === jainAadharNumber)) {
                return errorResponse(res, 'Already a member of this Sangh', 400);
            }

            const newMember = {
                userId: user._id,
                firstName,
                lastName,
                name: formatFullName(firstName, lastName),
                jainAadharNumber,
                email: email || user.email,
                phoneNumber: phoneNumber || user.phoneNumber,
                address: {
                    ...address,
                    city: address?.city || user.city,
                    district: address?.district || user.district,
                    state: address?.state || user.state
                },
                addedBy: req.user._id,
                addedAt: new Date(),
                status: 'active'
            };
            sangh.members.push(newMember);
            // Update user's Sangh roles
            await User.findByIdAndUpdate(user._id, {
                $push: {
                    sanghRoles: {
                        sanghId: sangh._id,
                        role: 'member',
                        level: sangh.level,
                        sanghType: sangh.sanghType || 'main',
                        addedAt: new Date()
                    }
                }
            });

            await sangh.save();

            return successResponse(res, {
                member: newMember,
                sangh: {
                    _id: sangh._id,
                    name: sangh.name,
                    level: sangh.level,
                    totalMembers: sangh.members.length
                }
            }, 'Member added successfully');
        }
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});


// Remove member from Sangh
const removeSanghMember = asyncHandler(async (req, res) => {
    try {
        const { sanghId, memberId } = req.params;

        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        // For city Sanghs, maintain minimum 3 members
        if (sangh.level === 'city' && sangh.members.length <= 3) {
            return errorResponse(res, 'City Sangh must maintain at least 3 members', 400);
        }

        const memberToRemove = sangh.members.find(
            member => member._id.toString() === memberId
        );

        if (!memberToRemove) {
            return errorResponse(res, 'Member not found', 404);
        }

        // Remove member's role from User document
        await User.findByIdAndUpdate(memberToRemove.userId, {
            $pull: {
                sanghRoles: {
                    sanghId: sangh._id
                }
            }
        });

        sangh.members = sangh.members.filter(
            member => member._id.toString() !== memberId
        );

        await sangh.save();
        return successResponse(res, sangh, 'Member removed successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Update member details
const updateMemberDetails = asyncHandler(async (req, res) => {
    try {
        const { sanghId, memberId } = req.params;
        const updates = req.body;

        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        const memberIndex = sangh.members.findIndex(
            member => member._id.toString() === memberId
        );

        if (memberIndex === -1) {
            return errorResponse(res, 'Member not found', 404);
        }

        // Handle document updates if files are provided
        if (req.files) {
            if (req.files['memberJainAadhar']) {
                // Delete old document if exists
                if (sangh.members[memberIndex].document) {
                    await deleteS3File(sangh.members[memberIndex].document);
                }
                updates.document = req.files['memberJainAadhar'][0].location;
            }
            if (req.files['memberPhoto']) {
                // Delete old photo if exists
                if (sangh.members[memberIndex].photo) {
                    await deleteS3File(sangh.members[memberIndex].photo);
                }
                updates.photo = req.files['memberPhoto'][0].location;
            }
        }

        // Update member details
        Object.assign(sangh.members[memberIndex], {
            ...sangh.members[memberIndex].toObject(),
            ...updates,
            name: updates.firstName && updates.lastName ? 
                formatFullName(updates.firstName, updates.lastName) : 
                sangh.members[memberIndex].name
        });

        await sangh.save();
        return successResponse(res, sangh, 'Member details updated successfully');
    } catch (error) {
        if (req.files) {
            await deleteS3Files(req.files);
        }
        return errorResponse(res, error.message, 500);
    }
});

// Get Sangh members
const getSanghMembers = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { page = 1, limit = 10, search } = req.query;

        const sangh = await HierarchicalSangh.findById(sanghId)
            .populate({
                path: 'members.userId',
                select: 'email phoneNumber'
            });

        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        let members = sangh.members || [];

        // Apply search filter if provided
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            members = members.filter(member => 
                searchRegex.test(member.name) || 
                searchRegex.test(member.jainAadharNumber)
            );
        }

        // Apply pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = parseInt(page) * parseInt(limit);
        const total = members.length;

        const paginatedMembers = members.slice(startIndex, endIndex);

        return successResponse(res, {
            members: paginatedMembers,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        }, 'Members retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

const addMultipleSanghMembers = asyncHandler(async (req, res) => {
    return addSanghMember(req, res);
});
// Create specialized Sangh (Women/Youth)
const createSpecializedSangh = asyncHandler(async (req, res) => {
    try {
        const parentSangh = req.parentSangh; // From canCreateSpecializedSangh middleware
        const {
            name,
            sanghType,
            level,
            officeBearers,
            description,
            contact,
            socialMedia
        } = req.body;

        // Validate sanghType
        if (!['women', 'youth'].includes(sanghType)) {
            return errorResponse(res, 'Invalid Sangh type. Must be "women" or "youth"', 400);
        }

        // If creating from a specialized Sangh, ensure the types match
        if (parentSangh.sanghType !== 'main' && parentSangh.sanghType !== sanghType) {
            return errorResponse(res, `You can only create a ${parentSangh.sanghType} Sangh as a ${parentSangh.sanghType} Sangh president`, 400);
        }

        // Determine the parent main Sangh
        let parentMainSanghId;
        if (parentSangh.sanghType === 'main') {
            parentMainSanghId = parentSangh._id;
        } else {
            // If parent is already a specialized Sangh, use its parentMainSangh
            parentMainSanghId = parentSangh.parentMainSangh;
        }

        // Check if a specialized Sangh of this type already exists at this level
        let locationQuery = {};
        
        // Build location query based on the level
        if (level === 'state') {
            locationQuery = { 'location.state': req.body.location.state };
        } else if (level === 'district') {
            locationQuery = { 
                'location.state': req.body.location.state,
                'location.district': req.body.location.district 
            };
        } else if (level === 'city') {
            locationQuery = { 
                'location.state': req.body.location.state,
                'location.district': req.body.location.district,
                'location.city': req.body.location.city 
            };
        } else if (level === 'area') {
            locationQuery = { 
                'location.state': req.body.location.state,
                'location.district': req.body.location.district,
                'location.city': req.body.location.city,
                'location.area': req.body.location.area 
            };
        }
        
        const existingSpecializedSangh = await HierarchicalSangh.findOne({
            level: level,
            ...locationQuery,
            sanghType: sanghType,
            status: 'active'
        });

        if (existingSpecializedSangh) {
            return errorResponse(res, `A ${sanghType} Sangh already exists at this ${level} level in this location`, 400);
        }

        // Validate office bearers
        if (!officeBearers || !officeBearers.president || !officeBearers.secretary || !officeBearers.treasurer) {
            return errorResponse(res, 'All office bearer details are required', 400);
        }

        // Format office bearers data
        const formattedOfficeBearers = [];
        for (const role of ['president', 'secretary', 'treasurer']) {
            const bearer = officeBearers[role];
            
            // Find the user by Jain Aadhar
            const user = await User.findOne({
                jainAadharNumber: bearer.jainAadharNumber,
                jainAadharStatus: 'verified'
            });

            if (!user) {
                return errorResponse(res, `${role}'s Jain Aadhar is not verified`, 400);
            }

            // Check if user is already an office bearer in another active Sangh
            const existingSangh = await HierarchicalSangh.findOne({
                'officeBearers': {
                    $elemMatch: {
                        'userId': user._id,
                        'status': 'active'
                    }
                },
                'status': 'active',
                '_id': { $ne: parentSangh._id }
            });

            if (existingSangh) {
                return errorResponse(res, `${role} is already an office bearer in another Sangh`, 400);
            }

            // Format the name
            const formattedName = formatFullName(bearer.firstName, bearer.lastName);

            // Add to formatted office bearers
            formattedOfficeBearers.push({
                role: role,
                userId: user._id,
                firstName: bearer.firstName,
                lastName: bearer.lastName,
                name: formattedName,
                jainAadharNumber: bearer.jainAadharNumber,
                document: bearer.document || req.files?.[`${role}JainAadhar`]?.[0]?.location || '',
                photo: bearer.photo || req.files?.[`${role}Photo`]?.[0]?.location || '',
                appointmentDate: new Date(),
                termEndDate: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)), // 2 years from now
                status: 'active'
            });
        }

        // Create the specialized Sangh
        const specializedSangh = new HierarchicalSangh({
            name,
            level: level, // Same level as parent Sangh
            location: req.body.location, // Same location as parent Sangh
            parentSangh: level === 'country' ? null : parentSangh._id, // Country level Sanghs don't have parent
            parentMainSangh: level === 'country' ? null : parentMainSanghId, // Country level Sanghs don't have parent
            sanghType: sanghType,
            officeBearers: formattedOfficeBearers,
            description,
            contact,
            socialMedia,
            createdBy: req.user._id
        });

        await specializedSangh.save();

        // Update the sanghRoles for each office bearer
        for (const officeBearer of formattedOfficeBearers) {
            await User.findByIdAndUpdate(officeBearer.userId, {
                $push: {
                    sanghRoles: {
                        sanghId: specializedSangh._id,
                        role: officeBearer.role,
                        level: specializedSangh.level,
                        sanghType: sanghType,
                        addedAt: new Date()
                    }
                }
            });
        }

        return successResponse(res, {
            message: `${sanghType.charAt(0).toUpperCase() + sanghType.slice(1)} Sangh created successfully`,
            sangh: specializedSangh
        });
    } catch (error) {
        if (req.files) {
            await deleteS3Files(req.files);
        }
        return errorResponse(res, error.message, 500);
    }
});

// Get specialized Sanghs for a main Sangh
const getSpecializedSanghs = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;

        // Verify the Sangh exists and is a main Sangh
        const mainSangh = await HierarchicalSangh.findOne({
            _id: sanghId,
            sanghType: 'main',
            status: 'active'
        });

        if (!mainSangh) {
            return errorResponse(res, 'Main Sangh not found', 404);
        }

        // Find specialized Sanghs
        const specializedSanghs = await HierarchicalSangh.find({
            parentMainSangh: sanghId,
            status: 'active'
        }).select('-__v');

        return successResponse(res, {
            mainSangh: {
                _id: mainSangh._id,
                name: mainSangh.name,
                level: mainSangh.level,
                location: mainSangh.location
            },
            specializedSanghs
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Update specialized Sangh
const updateSpecializedSangh = asyncHandler(async (req, res) => {
    try {
        const sangh = req.sangh; // From canManageSpecializedSangh middleware
        const {
            name,
            description,
            contact,
            socialMedia,
            officeBearers
        } = req.body;

        // Create an updates object
        const updates = {};
        
        // Basic info updates
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (contact) updates.contact = contact;
        if (socialMedia) updates.socialMedia = socialMedia;

        // Handle office bearer updates if provided
        if (officeBearers) {
            for (const role of ['president', 'secretary', 'treasurer']) {
                if (officeBearers[role]) {
                    const bearer = officeBearers[role];
                    const currentBearer = sangh.officeBearers.find(b => b.role === role);
                    
                    // If changing the office bearer
                    if (bearer.jainAadharNumber && bearer.jainAadharNumber !== currentBearer.jainAadharNumber) {
                        // Find the user by Jain Aadhar
                        const user = await User.findOne({
                            jainAadharNumber: bearer.jainAadharNumber,
                            jainAadharStatus: 'verified'
                        });

                        if (!user) {
                            return errorResponse(res, `${role}'s Jain Aadhar is not verified`, 400);
                        }

                        // Check if user is already an office bearer in another active Sangh
                        const existingSangh = await HierarchicalSangh.findOne({
                            'officeBearers': {
                                $elemMatch: {
                                    'userId': user._id,
                                    'status': 'active'
                                }
                            },
                            'status': 'active',
                            '_id': { $ne: sangh._id }
                        });

                        if (existingSangh) {
                            return errorResponse(res, `${role} is already an office bearer in another Sangh`, 400);
                        }

                        // Format the name
                        const formattedName = formatFullName(bearer.firstName, bearer.lastName);

                        // Remove role from current office bearer's sanghRoles
                        if (currentBearer) {
                            await User.findByIdAndUpdate(currentBearer.userId, {
                                $pull: {
                                    sanghRoles: {
                                        sanghId: sangh._id,
                                        role: role
                                    }
                                }
                            });
                        }

                        // Add role to new office bearer's sanghRoles
                        await User.findByIdAndUpdate(user._id, {
                            $push: {
                                sanghRoles: {
                                    sanghId: sangh._id,
                                    role: role,
                                    level: sangh.level,
                                    sanghType: sangh.sanghType,
                                    addedAt: new Date()
                                }
                            }
                        });

                        // Update the office bearer in the Sangh
                        await HierarchicalSangh.updateOne(
                            { 
                                _id: sangh._id,
                                'officeBearers.role': role
                            },
                            {
                                $set: {
                                    'officeBearers.$.userId': user._id,
                                    'officeBearers.$.firstName': bearer.firstName,
                                    'officeBearers.$.lastName': bearer.lastName,
                                    'officeBearers.$.name': formattedName,
                                    'officeBearers.$.jainAadharNumber': bearer.jainAadharNumber,
                                    'officeBearers.$.appointmentDate': new Date(),
                                    'officeBearers.$.termEndDate': new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)) // 2 years from now
                                }
                            }
                        );
                    } else {
                        // Just update the existing office bearer's details
                        if (bearer.firstName || bearer.lastName) {
                            const firstName = bearer.firstName || currentBearer.firstName;
                            const lastName = bearer.lastName || currentBearer.lastName;
                            const formattedName = formatFullName(firstName, lastName);
                            
                            await HierarchicalSangh.updateOne(
                                { 
                                    _id: sangh._id,
                                    'officeBearers.role': role
                                },
                                {
                                    $set: {
                                        'officeBearers.$.firstName': firstName,
                                        'officeBearers.$.lastName': lastName,
                                        'officeBearers.$.name': formattedName
                                    }
                                }
                            );
                        }
                    }

                    // Handle document uploads
                    if (req.files && req.files[`${role}JainAadhar`]) {
                        // Delete old document if it exists
                        if (currentBearer && currentBearer.document) {
                            await deleteS3File(currentBearer.document);
                        }
                        
                        await HierarchicalSangh.updateOne(
                            { 
                                _id: sangh._id,
                                'officeBearers.role': role
                            },
                            {
                                $set: {
                                    'officeBearers.$.document': req.files[`${role}JainAadhar`][0].location
                                }
                            }
                        );
                    }

                    // Handle photo uploads
                    if (req.files && req.files[`${role}Photo`]) {
                        // Delete old photo if it exists
                        if (currentBearer && currentBearer.photo) {
                            await deleteS3File(currentBearer.photo);
                        }
                        
                        await HierarchicalSangh.updateOne(
                            { 
                                _id: sangh._id,
                                'officeBearers.role': role
                            },
                            {
                                $set: {
                                    'officeBearers.$.photo': req.files[`${role}Photo`][0].location
                                }
                            }
                        );
                    }
                }
            }
        }

        // Get the updated Sangh
        const updatedSangh = await HierarchicalSangh.findById(sangh._id);

        return successResponse(res, {
            message: 'Specialized Sangh updated successfully',
            sangh: updatedSangh
        });
    } catch (error) {
        if (req.files) {
            await deleteS3Files(req.files);
        }
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
    createHierarchicalSangh,
    getHierarchy,
    getAllSangh,
    getSanghsByLevelAndLocation,
    getChildSanghs,
    updateHierarchicalSangh,
    addSanghMember,
    removeSanghMember,
    updateMemberDetails,
    getSanghMembers,
    addMultipleSanghMembers,
    createSpecializedSangh,
    getSpecializedSanghs,
    updateSpecializedSangh,
    checkOfficeBearerTerms,
    getAllSanghs
}; 