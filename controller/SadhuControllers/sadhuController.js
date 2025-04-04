const Sadhu = require('../../model/SadhuModels/sadhuModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const User = require('../../model/UserRegistrationModels/userModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');


// Submit new sadhu info
const submitSadhuInfo = async (req, res) => {
    try {
        const sadhuData = { ...req.body };
        sadhuData.submittedBy = req.user._id;

        // Verify city Sangh exists
        const citySangh = await HierarchicalSangh.findOne({
            _id: sadhuData.citySanghId,
            level: 'city',
            status: 'active'
        });

        if (!citySangh) {
            return errorResponse(res, 'Invalid city Sangh selected', 400);
        }
        
        // Handle file uploads
        if (req.files) {
            // Handle profile image
            if (req.files.entityPhoto) {
                sadhuData.uploadImage = req.files.entityPhoto[0].location;
            }

            // Handle documents if any
            if (req.files.entityDocuments) {
                sadhuData.documents = req.files.entityDocuments.map(doc => doc.location);
            }
        }

        const sadhu = new Sadhu(sadhuData);
        await sadhu.save();

        return successResponse(res, 'Sadhu information submitted successfully for review', sadhu);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Review sadhu submission
const reviewSadhuSubmission = async (req, res) => {
    try {
        const { sadhuId } = req.params;
        const { status } = req.body;

        const sadhu = await Sadhu.findById(sadhuId);
        if (!sadhu) {
            return errorResponse(res, 'Sadhu not found', 404);
        }

        sadhu.applicationStatus = status;
        sadhu.reviewInfo = {
            reviewedBy: {
                cityPresidentId: req.user._id,
                reviewDate: new Date(),
            }
        };

        if (status === 'approved') {
            // Find the user who submitted the sadhu application
            const submittedByUser = await User.findById(sadhu.submittedBy);
            
            if (submittedByUser) {
                // Add owner role to the user who submitted the application
                if (!submittedByUser.sadhuRoles) {
                    submittedByUser.sadhuRoles = [];
                }
                
                submittedByUser.sadhuRoles.push({
                    sadhuId: sadhu._id,
                    role: 'owner',
                    approvedAt: new Date()
                });
                await submittedByUser.save();
            }
            await sadhu.save();
            return successResponse(res, 'Sadhu approved and role assigned to user', {
                sadhu
            });
        }
        await sadhu.save();
        return successResponse(res, `Sadhu submission ${status}`, sadhu);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Update sadhu profile
const updateSadhuProfile = async (req, res) => {
    try {
        const sadhu = req.sadhu;
        const updates = req.body;
        
        // Handle file uploads
        if (req.files) {
            // Handle profile image update
            if (req.files.entityPhoto) {
                // Delete old image if exists
                if (sadhu.uploadImage) {
                    const key = extractS3KeyFromUrl(sadhu.uploadImage);
                    await s3Client.send(new DeleteObjectCommand({ Key: key }));
                }
                updates.uploadImage = req.files.entityPhoto[0].location;
            }

            // Handle documents update if any
            if (req.files.entityDocuments) {
                // Delete old documents if they exist
                if (sadhu.documents && sadhu.documents.length > 0) {
                    await Promise.all(sadhu.documents.map(async (url) => {
                        const key = extractS3KeyFromUrl(url);
                        await s3Client.send(new DeleteObjectCommand({ Key: key }));
                    }));
                }
                updates.documents = req.files.entityDocuments.map(doc => doc.location);
            }
        }

        // Update allowed fields only
        Object.keys(updates).forEach(key => {
            if (key !== 'status' && key !== 'accessCredentials' && key !== 'reviewedBy') {
                sadhu[key] = updates[key];
            }
        });

        await sadhu.save();
        return successResponse(res, 'Profile updated successfully', sadhu);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

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

// Get pending sadhu applications for city president
const getPendingSadhuApplications = async (req, res) => {
    try {
        const { citySanghId } = req.params;

        const applications = await Sadhu.find({
            citySanghId,
            applicationStatus: 'pending'
        }).sort({ createdAt: -1 });

        return successResponse(res, applications);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Get all sadhus (public)
const getAllSadhus = async (req, res) => {
    try {
        const sadhus = await Sadhu.find({ 
            status: 'approved',
            isActive: true 
        })
        .select('-accessCredentials')
        .populate('citySanghId', 'location');

        return successResponse(res, 'Sadhus retrieved successfully', sadhus);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};
// Get all sadhus (public)
const getAllSadhu = async (req, res) => {
    try {
        const sadhus = await Sadhu.find({ 
           // isActive: true 
        })
        .select('-accessCredentials')  // Sirf accessCredentials exclude kiya hai
        .populate('citySanghId', 'location'); // citySanghId ka sirf location fetch hoga

        return successResponse(res, 'Sadhus retrieved successfully', sadhus);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Get single sadhu (public)
const getSadhuById = async (req, res) => {
    try {
        const { sadhuId } = req.params;
        const sadhu = await Sadhu.findOne({
            _id: sadhuId,
            status: 'approved',
            isActive: true
        })
        .select('-accessCredentials')
        .populate('citySanghId', 'location');
        if (!sadhu) {
            return errorResponse(res, 'Sadhu not found', 404);
        }
        return successResponse(res, 'Sadhu retrieved successfully', sadhu);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

module.exports = {
    submitSadhuInfo,
    reviewSadhuSubmission,
    getAllSadhus,
    getAllSadhu,
    getSadhuById,
    updateSadhuProfile,
    getAvailableCities,
    getPendingSadhuApplications
};
