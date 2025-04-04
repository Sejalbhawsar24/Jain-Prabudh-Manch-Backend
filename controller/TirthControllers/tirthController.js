const Tirth = require('../../model/TirthModels/tirthModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');

// Get available cities with active Sanghs
const getAvailableCities = async (req, res) => {
    try {
        const cities = await HierarchicalSangh.find(
            { level: 'city', status: 'active' },
            'location.city location.state location.district _id'
        ).sort({ 'location.city': 1 });

        return successResponse(res, cities);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Submit new Tirth application
const submitTirthApplication = async (req, res) => {
    try {
        console.log("Headers Authorization:", req.headers.authorization); // ✅ Token print karein
        console.log("Received Body:", req.body);
        const {
            name,
            userId,
            tirthType,
            tirthShetra,
            otherTirthShetra,
            regionName,
            mulPratima,
            description,
            location,
            citySanghId,
            managerName,            
            facilities,
            prabandhInputs,
            transport,
            nearestCity,
            nearestTirth,
            regionHistory,
            projects,
        } = req.body;
        // ✅ Parse JSON string fields
        const parsedManagerName = JSON.parse(managerName);
        const parsedFacilities = JSON.parse(facilities);
        const parsedPrabandhInputs = JSON.parse(prabandhInputs);
        const parsedTransport = JSON.parse(transport);
        // Verify city Sangh exists
        const citySangh = await HierarchicalSangh.findOne({
            _id: citySanghId,
            level: 'city',
            status: 'active'
        });

        if (!citySangh) {
            return errorResponse(res, 'Invalid city Sangh selected', 400);
        }

        // Handle uploaded photos and documents
        const photos = [];
        const documents = [];

        if (req.files) {
            if (req.files.entityPhoto) {
                photos.push(...req.files.entityPhoto.map(file => ({
                    url: file.location,
                    type: file.mimetype.startsWith('image/') ? 'image' : 'other'
                })));
            }

            if (req.files.entityDocuments) {
                documents.push(...req.files.entityDocuments.map(file => ({
                    url: file.location,
                    type: file.mimetype === 'application/pdf' ? 'pdf' : 'other'
                })));
            }
        }

        const tirth = new Tirth({
            name,
            tirthType,
            tirthShetra,
            otherTirthShetra,
            regionName,
            mulPratima,
            description,
            location,
            citySanghId,
            userId,
            managerName:parsedManagerName,
            photos,
            documents,
            nearestCity,
            nearestTirth,
            regionHistory,
            projects,
            facilities: parsedFacilities, 
            prabandhInputs: parsedPrabandhInputs,
            transport: parsedTransport 
        });

        await tirth.save();

        return successResponse(res, {
            message: 'Tirth application submitted successfully',
            tirthId: tirth._id
        });
    } catch (error) {
        // If there's an error, clean up any uploaded files
        if (req.files) {
            const deletePromises = [];
            if (req.files.entityPhoto) {
                deletePromises.push(...req.files.entityPhoto.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            if (req.files.entityDocuments) {
                deletePromises.push(...req.files.entityDocuments.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            await Promise.all(deletePromises);
        }
        return errorResponse(res, error.message, 500);
    }
};

// Get pending applications for city president
const getPendingApplications = async (req, res) => {
    try {
        const { citySanghId } = req.params;

        const applications = await Tirth.find({
            citySanghId,
            applicationStatus: 'pending'
        }).sort({ createdAt: -1 });

        return successResponse(res, applications);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Review Tirth application
const reviewApplication = async (req, res) => {
    try {
        const { tirthId } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return errorResponse(res, 'Invalid review status', 400);
        }

        const tirth = await Tirth.findOneAndUpdate(
            { _id: tirthId, applicationStatus: 'pending' },
            {
                applicationStatus: status,
                // reviewNotes: {
                //     text: notes,
                //     reviewedBy: req.user._id,
                //     reviewedAt: new Date()
                // }
            },
            { new: true }
        );

        if (!tirth) {
            return errorResponse(res, 'Tirth application not found or already reviewed', 404);
        }

        // ✅ DEBUG: Check if tirth.manager is present
        console.log("Tirth Manager Object:", tirth.managerName);

        // If approved, add Tirth role to the manager's user account
        if (status === 'approved' && tirth.managerName && tirth.managerName.jainAadharNumber) {
            const User = require('../../model/UserRegistrationModels/userModel');
            const user = await User.findOne({ jainAadharNumber: tirth.managerName.jainAadharNumber });

            if (!user) {
                console.log("❌ User not found for Jain Aadhar:", tirth.managerName.jainAadharNumber);
            } else {
                console.log("✅ User found:", user._id);

                // Initialize tirthRoles array if it doesn't exist
                if (!Array.isArray(user.tirthRoles)) {
                    user.tirthRoles = [];
                }

                // ✅ DEBUG: Check if user already has the role
                console.log("Existing tirthRoles:", user.tirthRoles);

                const hasRole = user.tirthRoles.some(role =>
                    role.tirthId.toString() === tirth._id.toString()
                );

                if (!hasRole) {
                    // ✅ Add the Tirth role
                    user.tirthRoles.push({
                        tirthId: tirth._id,
                        role: 'manager',
                        startDate: new Date()
                    });

                    // ✅ Ensure correct save
                    await user.markModified('tirthRoles');  // Ensure Mongoose recognizes the change
                    await user.save();

                    console.log("✅ Updated tirthRoles:", user.tirthRoles);
                } else {
                    console.log("ℹ️ User already has this role, skipping update.");
                }
            }
        }

        return successResponse(res, {
            message: `Tirth application ${status}`,
            tirth
        });

    } catch (error) {
        console.error("❌ Error in reviewApplication:", error);
        return errorResponse(res, error.message, 500);
    }
};

// Get Tirth details
const getTirthDetails = async (req, res) => {
    try {
        const { tirthId } = req.params;

        const tirth = await Tirth.findOne({
            _id: tirthId,
            status: 'active'
        }).populate('citySanghId', 'name location');

        if (!tirth) {
            return errorResponse(res, 'Tirth not found', 404);
        }

        return successResponse(res, tirth);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Update Tirth details
const updateTirthDetails = async (req, res) => {
    try {
        const { tirthId } = req.params;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated
        delete updateData.accessCredentials;
        delete updateData.applicationStatus;
        delete updateData.reviewNotes;
        delete updateData.status;
        delete updateData.citySanghId;

        const tirth = await Tirth.findOne({ _id: tirthId, status: 'active' });

        if (!tirth) {
            return errorResponse(res, 'Tirth not found', 404);
        }

        // Handle photo updates if replacePhotos flag is set
        if (req.body.replacePhotos === 'true' && tirth.photos && tirth.photos.length > 0) {
            const deletePromises = tirth.photos.map(async (photo) => {
                try {
                    const key = extractS3KeyFromUrl(photo.url);
                    if (key) {
                        await s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.AWS_BUCKET_NAME,
                            Key: key
                        }));
                    }
                } catch (error) {
                    console.error(`Error deleting photo from S3: ${photo.url}`, error);
                }
            });
            
            await Promise.all(deletePromises);
            tirth.photos = [];
        }

        // Handle document updates if replaceDocuments flag is set
        if (req.body.replaceDocuments === 'true' && tirth.documents && tirth.documents.length > 0) {
            const deletePromises = tirth.documents.map(async (doc) => {
                try {
                    const key = extractS3KeyFromUrl(doc.url);
                    if (key) {
                        await s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.AWS_BUCKET_NAME,
                            Key: key
                        }));
                    }
                } catch (error) {
                    console.error(`Error deleting document from S3: ${doc.url}`, error);
                }
            });
            
            await Promise.all(deletePromises);
            tirth.documents = [];
        }

        // Add new photos and documents if provided
        if (req.files) {
            if (req.files.entityPhoto) {
                tirth.photos.push(...req.files.entityPhoto.map(file => ({
                    url: file.location,
                    caption: ''
                })));
            }
            if (req.files.entityDocuments) {
                tirth.documents.push(...req.files.entityDocuments.map(file => ({
                    url: file.location,
                    type: file.mimetype,
                    name: file.originalname
                })));
            }
        }

        // Update other fields
        Object.assign(tirth, updateData);
        await tirth.save();

        return successResponse(res, {
            message: 'Tirth details updated successfully',
            tirth
        });
    } catch (error) {
        // If there's an error and new files were uploaded, clean them up
        if (req.files) {
            const deletePromises = [];
            if (req.files.entityPhoto) {
                deletePromises.push(...req.files.entityPhoto.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            if (req.files.entityDocuments) {
                deletePromises.push(...req.files.entityDocuments.map(file => 
                    s3Client.send(new DeleteObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: extractS3KeyFromUrl(file.location)
                    }))
                ));
            }
            await Promise.all(deletePromises);
        }
        return errorResponse(res, error.message, 500);
    }
};

// Get all Tirths in a city
const getCityTirths = async (req, res) => {
    try {
        const { citySanghId } = req.params;

        const tirths = await Tirth.find({
            citySanghId,
            status: 'active',
            applicationStatus: 'approved'
        }).sort({ name: 1 });

        return successResponse(res, tirths);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Tirth login with JWT token
const tirthLogin = async (req, res) => {
    try {
        // The user should already be authenticated via JWT token
        // We just need to verify they have the appropriate Tirth role
        const userId = req.user._id;
        const { tirthId } = req.params;

        const User = require('../../model/UserRegistrationModels/userModel');
        const user = await User.findById(userId);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Check if user has the role for this Tirth
        const hasTirthRole = user.tirthRoles && user.tirthRoles.some(role => 
            role.tirthId.toString() === tirthId
        );

        if (!hasTirthRole) {
            return errorResponse(res, 'You do not have permission to access this Tirth', 403);
        }

        // Get the Tirth details
        const tirth = await Tirth.findOne({
            _id: tirthId,
            status: 'active',
            applicationStatus: 'approved'
        });

        if (!tirth) {
            return errorResponse(res, 'Tirth not found or not active', 404);
        }

        return successResponse(res, {
            message: 'Access granted',
            tirth
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Get all Tirths (public)
const getAllTirths = async (req, res) => {
    try {
        const tirths = await Tirth.find(
            { status: 'active', applicationStatus: 'approved' },
            'name tirthType location description uploadImage applicationStatus managerName'
        ).sort({ name: 1 });

        return successResponse(res, tirths);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
// Get all Tirths (public)
const getAllTirth = async (req, res) => {
    try {
        const tirths = await Tirth.find(
            { status: 'active' }, // Removed applicationStatus
            'name tirthType location description uploadImage userId'
        ).sort({ name: 1 });

        return successResponse(res, tirths);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};


module.exports = {
    getAvailableCities,
    submitTirthApplication,
    getPendingApplications,
    reviewApplication,
    getTirthDetails,
    updateTirthDetails,
    getCityTirths,
    tirthLogin,
    getAllTirths,
    getAllTirth
}; 