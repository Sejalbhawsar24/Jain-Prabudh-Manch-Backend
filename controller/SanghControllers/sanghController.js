// server/controller/SanghControllers/sanghController.js
const Sangh = require('../../model/SanghModels/sanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const asyncHandler = require('express-async-handler');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');

// Validation functions
const validateOfficeBearerAvailability = async (officeBearers, level) => {
  const positions = ['president', 'secretary', 'treasurer'];
  
  for (const position of positions) {
    const jainAadharNumber = officeBearers[position].jainAadharNumber;
    
    const existingSangh = await Sangh.findOne({
      $or: [
        { 'officeBearers.president.jainAadharNumber': jainAadharNumber },
        { 'officeBearers.secretary.jainAadharNumber': jainAadharNumber },
        { 'officeBearers.treasurer.jainAadharNumber': jainAadharNumber }
      ],
      level: level,
      status: 'active'
    });

    if (existingSangh) {
      throw new Error(`Person with Jain Aadhar ${jainAadharNumber} is already an office bearer in another ${level} level Sangh`);
    }
  }
};

const validateLocationHierarchy = (level, location) => {
  switch (level) {
    case 'city':
      if (!location.city || !location.district || !location.state) {
        throw new Error('City level Sangh requires city, district and state');
      }
      break;
    case 'district':
      if (!location.district || !location.state) {
        throw new Error('District level Sangh requires district and state');
      }
      break;
    case 'state':
      if (!location.state) {
        throw new Error('State level Sangh requires state');
      }
      break;
  }
};

const validateJainAadharNumbers = async (officeBearers, members = []) => {
  const jainAadharNumbers = [
    officeBearers.president.jainAadharNumber,
    officeBearers.secretary.jainAadharNumber,
    officeBearers.treasurer.jainAadharNumber,
    ...members.map(member => member.jainAadharNumber)
  ];

  const users = await User.find({
    jainAadharNumber: { $in: jainAadharNumbers },
    jainAadharStatus: 'verified'
  });

  const verifiedUsers = new Map(
    users.map(user => [user.jainAadharNumber, user])
  );

  // Verify office bearers
  const positions = ['president', 'secretary', 'treasurer'];
  for (const position of positions) {
    const jainAadharNumber = officeBearers[position].jainAadharNumber;
    const user = verifiedUsers.get(jainAadharNumber);
    
    if (!user) {
      throw new Error(`${position}'s Jain Aadhar number is not verified in our system`);
    }
  }

  // Verify members
  for (const member of members) {
    const user = verifiedUsers.get(member.jainAadharNumber);
    if (!user) {
      throw new Error(`Member ${member.firstName} ${member.lastName}'s Jain Aadhar number is not verified in our system`);
    }
  }

  return true;
};

// Core Sangh Management Functions
const createSangh = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      level,
      location,
      officeBearers,
      members,
      constituentSanghs,
    } = req.body;

    // If constituentSanghs is a string, try to parse it
    let parsedConstituentSanghs = constituentSanghs;
    if (typeof constituentSanghs === 'string') {
      try {
        parsedConstituentSanghs = JSON.parse(constituentSanghs);
      } catch (e) {
        console.log('Failed to parse constituentSanghs:', e);
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

    const missingDocs = requiredDocs.filter(doc => !req.files[doc]);
    if (missingDocs.length > 0) {
      return errorResponse(res, `Missing required documents: ${missingDocs.join(', ')}`, 400);
    }

    // Validate location hierarchy
    validateLocationHierarchy(level, location);

    // Validate Jain Aadhar numbers
    await validateJainAadharNumbers(officeBearers, members);

    // Validate office bearer availability
    await validateOfficeBearerAvailability(officeBearers, level);

    // Get users for office bearers
    const presidentUser = await User.findOne({ jainAadharNumber: officeBearers.president.jainAadharNumber });
    const secretaryUser = await User.findOne({ jainAadharNumber: officeBearers.secretary.jainAadharNumber });
    const treasurerUser = await User.findOne({ jainAadharNumber: officeBearers.treasurer.jainAadharNumber });

    // Format names
    const formatFullName = (firstName, lastName) => {
      return lastName.toLowerCase() === 'jain' 
        ? `${firstName} Jain`
        : `${firstName} Jain (${lastName})`;
    };

    // Create Sangh data
    const sanghData = {
      name,
      level,
      location,
      officeBearers: {
        president: {
          userId: presidentUser._id,
          firstName: officeBearers.president.firstName,
          lastName: officeBearers.president.lastName,
          name: formatFullName(officeBearers.president.firstName, officeBearers.president.lastName),
          jainAadharNumber: officeBearers.president.jainAadharNumber,
          document: req.files['presidentJainAadhar'][0].location,
          photo: req.files['presidentPhoto'][0].location
        },
        secretary: {
          userId: secretaryUser._id,
          firstName: officeBearers.secretary.firstName,
          lastName: officeBearers.secretary.lastName,
          name: formatFullName(officeBearers.secretary.firstName, officeBearers.secretary.lastName),
          jainAadharNumber: officeBearers.secretary.jainAadharNumber,
          document: req.files['secretaryJainAadhar'][0].location,
          photo: req.files['secretaryPhoto'][0].location
        },
        treasurer: {
          userId: treasurerUser._id,
          firstName: officeBearers.treasurer.firstName,
          lastName: officeBearers.treasurer.lastName,
          name: formatFullName(officeBearers.treasurer.firstName, officeBearers.treasurer.lastName),
          jainAadharNumber: officeBearers.treasurer.jainAadharNumber,
          document: req.files['treasurerJainAadhar'][0].location,
          photo: req.files['treasurerPhoto'][0].location
        }
      },
      constituentSanghs: parsedConstituentSanghs
    };

    // Add members for city level
    if (level === 'city') {
      if (!members || members.length < 3) {
        return errorResponse(res, 'City Sangh must have at least 3 members', 400);
      }

      // Get users for members
      const memberPromises = members.map(async member => {
        const user = await User.findOne({ jainAadharNumber: member.jainAadharNumber });
        return {
          userId: user._id,
          firstName: member.firstName,
          lastName: member.lastName,
          name: formatFullName(member.firstName, member.lastName),
          jainAadharNumber: member.jainAadharNumber,
          email: member.email,
          phoneNumber: member.phoneNumber,
          address: {
            street: member.address?.street || '',
            city: member.address?.city || user.city || '',
            district: member.address?.district || user.district || '',
            state: member.address?.state || user.state || '',
            pincode: member.address?.pincode || ''
          }
        };
      });

      sanghData.members = await Promise.all(memberPromises);
    }

    const sangh = await Sangh.create(sanghData);

    // Update office bearers' roles in User collection
    const officeBearerRoles = [
      { userId: presidentUser._id, role: 'president' },
      { userId: secretaryUser._id, role: 'secretary' },
      { userId: treasurerUser._id, role: 'treasurer' }
    ];

    // Update each office bearer's roles
    for (const bearer of officeBearerRoles) {
      await User.findByIdAndUpdate(bearer.userId, {
        $push: {
          sanghRoles: {
            sanghId: sangh._id,
            role: bearer.role,
            level: level
          }
        }
      });
    }

    // Update member roles if city level
    if (level === 'city') {
      for (const member of sanghData.members) {
        await User.findByIdAndUpdate(member.userId, {
          $push: {
            sanghRoles: {
              sanghId: sangh._id,
              role: 'member',
              level: level
            }
          }
        });
      }
    }

    return successResponse(res, sangh, 'Sangh created successfully', 201);

  } catch (error) {
    if (req.files) {
      await deleteS3Files(req.files);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Get all Sanghs with filters
const getAllSanghs = asyncHandler(async (req, res) => {
  try {
    const { level, city, district, state } = req.query;
    const query = {};

    if (level) query.level = level;
    if (city) query['location.city'] = city;
    if (district) query['location.district'] = district;
    if (state) query['location.state'] = state;

    const sanghs = await Sangh.find(query)
      .populate('officeBearers.president.userId', 'fullName')
      .populate('officeBearers.secretary.userId', 'fullName')
      .populate('officeBearers.treasurer.userId', 'fullName');

    return successResponse(res, sanghs, 'Sanghs retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Get Sangh by ID
const getSanghById = asyncHandler(async (req, res) => {
  try {
    const sangh = await Sangh.findById(req.params.id)
      .populate('officeBearers.president.userId')
      .populate('officeBearers.secretary.userId')
      .populate('officeBearers.treasurer.userId')
      .populate('members.userId');

    if (!sangh) {
      return errorResponse(res, 'Sangh not found', 404);
    }

    return successResponse(res, sangh, 'Sangh retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Member Management
const manageMember = asyncHandler(async (req, res) => {
    try {
        const { sanghId } = req.params;
        const action = req.method === 'POST' ? 'add' : 'remove';
        
        const sangh = await Sangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        if (action === 'add') {
            const { firstName, lastName, jainAadharNumber, email, phoneNumber, address } = req.body;

            const userToAdd = await User.findOne({
                jainAadharNumber,
                jainAadharStatus: 'verified'
            });

            if (!userToAdd) {
                return errorResponse(res, 'User not found or not verified', 404);
            }

            const isExistingMember = sangh.members.some(
                member => member.jainAadharNumber === jainAadharNumber
            );

            if (isExistingMember) {
                return errorResponse(res, 'User is already a member of this Sangh', 400);
            }

            const formatFullName = (firstName, lastName) => {
                return lastName.toLowerCase() === 'jain' 
                    ? `${firstName} Jain`
                    : `${firstName} Jain (${lastName})`;
            };

            const newMember = {
                userId: userToAdd._id,
                firstName,
                lastName,
                name: formatFullName(firstName, lastName),
                jainAadharNumber,
                email: email || userToAdd.email || '',
                phoneNumber: phoneNumber || userToAdd.phoneNumber || '',
                address: {
                    street: address?.street || '',
                    city: address?.city || userToAdd.city || '',
                    district: address?.district || userToAdd.district || '',
                    state: address?.state || userToAdd.state || '',
                    pincode: address?.pincode || ''
                }
            };

            sangh.members.push(newMember);

            await User.findByIdAndUpdate(userToAdd._id, {
                $push: {
                    sanghRoles: {
                        sanghId: sangh._id,
                        role: 'member',
                        level: sangh.level
                    }
                }
            });

            await sangh.save();
            return successResponse(res, sangh, 'Member added successfully');
        } else {
            const { memberId } = req.params;
            
            if (sangh.level === 'city' && sangh.members.length <= 3) {
                return errorResponse(res, 'Cannot remove member: City Sangh must maintain at least 3 members', 400);
            }

            const memberToRemove = sangh.members.find(
                member => member._id.toString() === memberId
            );

            if (!memberToRemove) {
                return errorResponse(res, 'Member not found', 404);
            }

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
        }
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Update Sangh
const updateSangh = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const oldSangh = await Sangh.findById(id);
    if (!oldSangh) {
      if (req.files) {
        await deleteS3Files(req.files);
      }
      return errorResponse(res, 'Sangh not found', 404);
    }

    if (req.files) {
      await deleteS3Files({
        president: {
          document: oldSangh.officeBearers.president.document,
          photo: oldSangh.officeBearers.president.photo
        },
        secretary: {
          document: oldSangh.officeBearers.secretary.document,
          photo: oldSangh.officeBearers.secretary.photo
        },
        treasurer: {
          document: oldSangh.officeBearers.treasurer.document,
          photo: oldSangh.officeBearers.treasurer.photo
        }
      });

      if (req.files['presidentJainAadhar']) {
        updates['officeBearers.president.document'] = req.files['presidentJainAadhar'][0].location;
      }
      if (req.files['presidentPhoto']) {
        updates['officeBearers.president.photo'] = req.files['presidentPhoto'][0].location;
      }
      if (req.files['secretaryJainAadhar']) {
        updates['officeBearers.secretary.document'] = req.files['secretaryJainAadhar'][0].location;
      }
      if (req.files['secretaryPhoto']) {
        updates['officeBearers.secretary.photo'] = req.files['secretaryPhoto'][0].location;
      }
      if (req.files['treasurerJainAadhar']) {
        updates['officeBearers.treasurer.document'] = req.files['treasurerJainAadhar'][0].location;
      }
      if (req.files['treasurerPhoto']) {
        updates['officeBearers.treasurer.photo'] = req.files['treasurerPhoto'][0].location;
      }
    }

    const sangh = await Sangh.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return successResponse(res, sangh, 'Sangh updated successfully');
  } catch (error) {
    if (req.files) {
      await deleteS3Files(req.files);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Helper function to delete S3 files
const deleteS3Files = async (files) => {
  const deletePromises = [];

  const deleteFile = async (fileUrl) => {
    if (!fileUrl) return;
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

  if (files.president) {
    deletePromises.push(deleteFile(files.president.document));
    deletePromises.push(deleteFile(files.president.photo));
  }
  if (files.secretary) {
    deletePromises.push(deleteFile(files.secretary.document));
    deletePromises.push(deleteFile(files.secretary.photo));
  }
  if (files.treasurer) {
    deletePromises.push(deleteFile(files.treasurer.document));
    deletePromises.push(deleteFile(files.treasurer.photo));
  }

  await Promise.all(deletePromises);
};

// Add new function for editing member details
const editMemberDetails = asyncHandler(async (req, res) => {
    try {
        const { sanghId, memberId } = req.params;
        const updates = req.body;
        
        const sangh = await Sangh.findById(sanghId);
        if (!sangh) {
            return errorResponse(res, 'Sangh not found', 404);
        }

        // Find the member in the Sangh
        const memberIndex = sangh.members.findIndex(
            member => member._id.toString() === memberId || 
                     member.userId.toString() === memberId
        );

        if (memberIndex === -1) {
            return errorResponse(res, 'Member not found in this Sangh', 404);
        }

        // Extract updates from personalDetails if present
        const memberUpdates = updates.personalDetails || updates;

        // Format the name if first name or last name is being updated
        if (memberUpdates.firstName || memberUpdates.lastName) {
            const firstName = memberUpdates.firstName || sangh.members[memberIndex].firstName;
            const lastName = memberUpdates.lastName || sangh.members[memberIndex].lastName;
            memberUpdates.name = lastName.toLowerCase() === 'jain' 
                ? `${firstName} Jain`
                : `${firstName} Jain (${lastName})`;
        }

        // Handle document updates if files are provided
        if (req.files) {
            if (req.files['memberJainAadhar']) {
                memberUpdates.document = req.files['memberJainAadhar'][0].location;
            }
            if (req.files['memberPhoto']) {
                memberUpdates.photo = req.files['memberPhoto'][0].location;
            }
        }

        // Format address if it's a string
        if (typeof memberUpdates.address === 'string') {
            memberUpdates.address = {
                street: memberUpdates.address,
                city: sangh.members[memberIndex].address.city,
                district: sangh.members[memberIndex].address.district,
                state: sangh.members[memberIndex].address.state,
                pincode: sangh.members[memberIndex].address.pincode
            };
        }

        // Update member details
        Object.assign(sangh.members[memberIndex], {
            ...sangh.members[memberIndex].toObject(),
            ...memberUpdates,
            address: {
                ...sangh.members[memberIndex].address,
                ...(memberUpdates.address || {})
            }
        });

        await sangh.save();

        return successResponse(res, sangh, 'Member details updated successfully');
    } catch (error) {
        // Delete uploaded files if there was an error
        if (req.files) {
            await deleteS3Files(req.files);
        }
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
  createSangh,
  getAllSanghs,
  getSanghById,
  manageMember,
  updateSangh,
  editMemberDetails
};