const asyncHandler = require('express-async-handler');
const Panch = require('../../model/SanghModels/panchModel');
const User = require('../../model/UserRegistrationModels/userModel')
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');

// Get all Panch members of a Sangh
const getPanchMembers = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { status } = req.query;

        const query = { sanghId };
        if (status) {
            query.status = status;
        }

        const panchMembers = await Panch.find(query)
            .sort({ createdAt: -1 });

        return successResponse(res, panchMembers, 'Panch members retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Update Panch member status with hierarchical permissions
const updatePanchStatus = asyncHandler(async (req, res) => {
    try {
        const { sanghId, panchId } = req.params;
        const { status, replacementMember, replacementDocs } = req.body;

        // Note: isPresident middleware has already checked hierarchical permissions
        // We can proceed with the operation as the user has been verified

        const panchGroup = await Panch.findOne({ sanghId });
        if (!panchGroup) {
            return errorResponse(res, 'Panch group not found', 404);
        }

        const memberToUpdate = panchGroup.members.id(panchId);
        if (!memberToUpdate) {
            return errorResponse(res, 'Panch member not found', 404);
        }

        // If deactivating a member, require a replacement
        if (status === 'inactive') {
            if (!replacementMember || !replacementDocs) {
                return errorResponse(res, 'Replacement member details and documents are required when deactivating a member', 400);
            }

            // Verify replacement member belongs to Sangh
            const sangh = await HierarchicalSangh.findById(panchGroup.sanghId);
            const isSanghMember = sangh.members.some(m => 
                m.jainAadharNumber === replacementMember.jainAadharNumber
            );

            if (!isSanghMember) {
                return errorResponse(res, 'Replacement member must be a Sangh member', 400);
            }

            // Create new member entry
            const newMember = {
                personalDetails: replacementMember,
                documents: {
                    jainAadharPhoto: replacementDocs.jainAadharPhoto,
                    profilePhoto: replacementDocs.profilePhoto
                },
                status: 'active'
            };

            // Update the Panch document
            await Panch.findOneAndUpdate(
                { 'members._id': panchId },
                {
                    $set: {
                        'members.$.status': 'inactive',
                        'members.$.endDate': new Date()
                    },
                    $push: { members: newMember }
                }
            );

            return successResponse(res, null, 'Panch member replaced successfully');
        }

        // If just updating status
        memberToUpdate.status = status;
        await memberToUpdate.save();

        return successResponse(res, memberToUpdate, 'Panch member status updated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Edit Panch member with hierarchical permissions
const editPanchMember = asyncHandler(async (req, res) => {
    try {
        const { sanghId, panchId } = req.params;
        const { personalDetails } = req.body;

        // Note: isPresident middleware has already checked hierarchical permissions
        // We can proceed with the operation as the user has been verified

        const updatedMember = await Panch.findOneAndUpdate(
            { 
                sanghId,
                'members._id': panchId 
            },
            {
                $set: {
                    'members.$.personalDetails': personalDetails
                }
            },
            { new: true }
        );

        if (!updatedMember) {
            return errorResponse(res, 'Panch member not found', 404);
        }

        return successResponse(res, updatedMember, 'Panch member details updated successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Delete Panch group with hierarchical permissions
const deletePanchGroup = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;

        // Note: isPresident middleware has already checked hierarchical permissions
        // We can proceed with the operation as the user has been verified

        const panchGroup = await Panch.findOne({ sanghId });
        if (!panchGroup) {
            return errorResponse(res, 'Panch group not found', 404);
        }

        // Delete all S3 files
        for (const member of panchGroup.members) {
            if (member.documents.jainAadharPhoto) {
                const key = extractS3KeyFromUrl(member.documents.jainAadharPhoto);
                if (key) {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: key
                    }));
                }
            }
            if (member.documents.profilePhoto) {
                const key = extractS3KeyFromUrl(member.documents.profilePhoto);
                if (key) {
                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: key
                    }));
                }
            }
        }

        await Panch.deleteOne({ sanghId });
        return successResponse(res, null, 'Panch group deleted successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

const createPanchGroup = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const { members } = req.body;
        const presidentUserId = req.user._id; // ✅ President user ID

        let parsedMembers;
        try {
            parsedMembers = members.map(member =>
                typeof member === 'string' ? JSON.parse(member) : member
            );
        } catch (error) {
            return errorResponse(res, 'Invalid member data format', 400);
        }

        if (!Array.isArray(parsedMembers) || parsedMembers.length !== 5) {
            return errorResponse(res, 'Exactly 5 members are required', 400);
        }

        const sangh = await HierarchicalSangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        const existingPanch = await Panch.findOne({ sanghId, status: 'active' });
        if (existingPanch) {
            return errorResponse(res, 'Active Panch group already exists for this Sangh', 400);
        }

        const jainAadharNumbers = new Set();
        for (const member of parsedMembers) {
            const isSanghMember = sangh.members.some(m =>
                m.jainAadharNumber === member.personalDetails.jainAadharNumber
            );
            if (!isSanghMember) {
                return errorResponse(res,
                    `Member with Jain Aadhar ${member.personalDetails.jainAadharNumber} is not a Sangh member`,
                    400
                );
            }

            // if (jainAadharNumbers.has(member.personalDetails.jainAadharNumber)) {
            //     return errorResponse(res, 'Duplicate Jain Aadhar numbers found', 400);
            // }
            jainAadharNumbers.add(member.personalDetails.jainAadharNumber);
            
            if (member.personalDetails.dateOfBirth) {
                const today = new Date();
                const birthDate = new Date(member.personalDetails.dateOfBirth);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (age < 50) {
                    return errorResponse(res, 
                        `Member with Jain Aadhar ${member.personalDetails.jainAadharNumber} must be at least 50 years old`,
                        400
                    );
                }
            } else {
                return errorResponse(res, 'Date of birth is required for all members', 400);
            }
            
            // if (!member.personalDetails.educationQualification) {
            //     return errorResponse(res, 'Education qualification is required for all members', 400);
            // }
        }

        const membersWithDocs = parsedMembers.map((member, index) => {
            const jainAadharFile = req.files[`members[${index}].jainAadharPhoto`]?.[0];
            const profileFile = req.files[`members[${index}].profilePhoto`]?.[0];

            return {
                personalDetails: member.personalDetails,
                documents: {
                    jainAadharPhoto: jainAadharFile?.location || '',
                    profilePhoto: profileFile?.location || ''
                },
                status: 'active'
            };
        });

        const panchGroup = await Panch.create({
            sanghId,
            members: membersWithDocs,
            term: {
                startDate: new Date(),
                endDate: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000))
            }
        });

        // ✅ **Get Level of Sangh President**
        const presidentUser = await User.findById(presidentUserId);
        let sanghRole = presidentUser.sanghRoles.find(role => role.sanghId.toString() === sanghId);
        const level = sanghRole ? sanghRole.level : 'city'; // Default level = city

        // ✅ **Update all members' Panch roles**
        await Promise.all(parsedMembers.map(async (member) => {
            const user = await User.findOne({ 
                'jainAadharNumber': member.personalDetails.jainAadharNumber 
            });

            if (user) {
                user.panchRoles.push({
                    panchId: panchGroup._id,
                    sanghId: sanghRole.sanghId,
                    role: 'panchMember',
                    level: level
                });
                await user.save();
            }
        }));

        const panchWithAccessKey = {
            _id: panchGroup._id,
            accessId: panchGroup.accessId,
            accessKey: panchGroup.accessKey,
            sanghId: panchGroup.sanghId,
            members: panchGroup.members.map(member => ({
                _id: member._id,
                name: `${member.personalDetails.firstName} ${member.personalDetails.surname}`,
                jainAadharNumber: member.personalDetails.jainAadharNumber
            })),
            term: panchGroup.term,
            status: panchGroup.status
        };

        return successResponse(res, panchWithAccessKey, 'Panch group created successfully', 201);

    } catch (error) {
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    if (file.location) {
                        const key = file.key;
                        s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.AWS_BUCKET_NAME,
                            Key: key
                        }));
                    }
                });
            });
        }
        return errorResponse(res, error.message, 500);
    }
});

// Get Panch group details
const getPanchGroup = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;

        const panchGroup = await Panch.findOne({
            sanghId,
            status: 'active'
        });

        if (!panchGroup) {
            return successResponse(res, null, 'No active Panch group found');
        }

        return successResponse(res, panchGroup, 'Panch group retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});
// Get All Panch Groups
const getAllPanchGroups = asyncHandler(async (req, res) => {
    try {
        const panchGroups = await Panch.find({ status: 'active' })
            .populate('sanghId', 'level name') // ✅ Fetching only 'level' and 'name' from Sangh collection
            .populate('members', 'personalDetails documents status'); // ✅ Fetching member details

        if (!panchGroups || panchGroups.length === 0) {
            return successResponse(res, [], 'No active Panch groups found');
        }

        return successResponse(res, panchGroups, 'All active Panch groups retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});


// Validate Panch access credentials
const validatePanchAccess = asyncHandler(async (req, res) => {
    try {
        const { panchId, jainAadharNumber, accessKey } = req.body;

        // Find the Panch group
        const panchGroup = await Panch.findById(panchId)
            .populate('sanghId', 'name level location');
            
        if (!panchGroup) {
            return errorResponse(res, 'Panch group not found', 404);
        }

        // First verify the access key matches the group's key
        if (panchGroup.accessKey !== accessKey) {
            return errorResponse(res, 'Invalid access key', 401);
        }

        // Then find the member by Jain Aadhar number
        const member = panchGroup.members.find(m => 
            m.personalDetails.jainAadharNumber === jainAadharNumber && 
            m.status === 'active'
        );

        if (!member) {
            return errorResponse(res, 'Member not found or inactive', 401);
        }

        // Return member details and Sangh info
        return successResponse(res, {
            panchMember: {
                _id: member._id,
                name: `${member.personalDetails.firstName} ${member.personalDetails.surname}`,
                jainAadharNumber: member.personalDetails.jainAadharNumber,
                personalDetails: member.personalDetails
            },
            panchGroup: {
                _id: panchGroup._id,
                accessId: panchGroup.accessId,
                term: panchGroup.term,
                sangh: panchGroup.sanghId
            }
        }, 'Panch access validated successfully');

    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
    getPanchMembers,
    updatePanchStatus,
    createPanchGroup,
    getPanchGroup,
    editPanchMember,
    deletePanchGroup,
    validatePanchAccess,
    getAllPanchGroups
}; 