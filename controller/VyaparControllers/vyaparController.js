const JainVyapar = require('../../model/VyaparModels/vyaparModel');
const HierarchicalSangh = require('../../model/SanghModels/hierarchicalSanghModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { s3Client, DeleteObjectCommand } = require('../../config/s3Config');
const { extractS3KeyFromUrl } = require('../../utils/s3Utils');
const User = require('../../model/UserRegistrationModels/userModel');

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
const submitVyaparApplication = async (req, res) => {
    try {
        console.log("Full Request Body:", req.body);  // 🔍 Check what is coming
        console.log("Location Received:", req.body.location);  // 🔍 Check location data

        const {
            businessName,
            businessType,
            productCategory,
            description,
            location,
            owner,
            businessDetails
        } = req.body;

        // ✅ Parse location JSON if required
        let parsedLocation = location;
        if (typeof location === 'string') {
            parsedLocation = JSON.parse(location);
        }

        console.log("Parsed Location:", parsedLocation);  // 🔍 Check after parsing

        const vyapar = new JainVyapar({
            businessName,
            businessType,
            productCategory,
            description,
            location: parsedLocation,  // ✅ Use parsed location
            owner: {
                ...owner,
                userId: req.user._id
            },
            businessDetails,
            photos: [],
            documents: [],
            applicationStatus: 'approved',
            status: 'active',
            reviewNotes: {
                text: 'Auto-approved',
                reviewedAt: new Date()
            }
        });

        await vyapar.save();

        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                vyaparRoles: {
                    vyaparId: vyapar._id,
                    role: 'owner'
                }
            }
        });

        return successResponse(res, {
            message: 'Business created successfully and ready to use',
            vyaparId: vyapar._id
        });

    } catch (error) {
        console.error("Error in submitVyaparApplication:", error);
        return errorResponse(res, error.message, 500);
    }
};

// Get pending applications for city president
const getPendingApplications = async (req, res) => {
    try {
        const { citySanghId } = req.params;
        const applications = await JainVyapar.find({
            citySanghId,
            applicationStatus: 'pending'
        }).sort({ createdAt: -1 });

        return successResponse(res, applications);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Review business application
const reviewApplication = async (req, res) => {
    try {
        const { vyaparId } = req.params;
        const { status, reviewNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return errorResponse(res, 'Invalid status', 400);
        }

        const vyapar = await JainVyapar.findById(vyaparId);
        if (!vyapar) {
            return errorResponse(res, 'Business application not found', 404);
        }

        // Update application status
        vyapar.applicationStatus = status;
        vyapar.status = status === 'approved' ? 'active' : 'inactive';
        
        // Add review notes
        vyapar.reviewNotes = {
            text: reviewNotes?.text || `Application ${status}`,
            reviewedBy: req.user._id,
            reviewedAt: new Date()
        };

        await vyapar.save();

        // If approved, add Vyapar role to the owner's user account
        if (status === 'approved' && vyapar.owner && vyapar.owner.jainAadharNumber) {
            const user = await User.findOne({ jainAadharNumber: vyapar.owner.jainAadharNumber });
            
            if (user) {
                // Initialize vyaparRoles array if it doesn't exist
                if (!user.vyaparRoles) {
                    user.vyaparRoles = [];
                }
                
                // Check if the user already has this role
                const hasRole = user.vyaparRoles.some(role => 
                    role.vyaparId.toString() === vyapar._id.toString()
                );
                
                if (!hasRole) {
                    // Add the Vyapar role
                    user.vyaparRoles.push({
                        vyaparId: vyapar._id,
                        role: 'owner',
                        startDate: new Date()
                    });
                    
                    await user.save();
                }
            }
        }

        return successResponse(res, {
            message: `Business application ${status}`,
            vyapar: {
                _id: vyapar._id,
                businessName: vyapar.businessName,
                applicationStatus: vyapar.applicationStatus,
                status: vyapar.status
            }
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Vyapar login with JWT token
const vyaparLogin = async (req, res) => {
    try {
        // The user should already be authenticated via JWT token
        // We just need to verify they have the appropriate Vyapar role
        const userId = req.user._id;
        const { vyaparId } = req.params;

        const user = await User.findById(userId);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Check if user has the role for this Vyapar
        const hasVyaparRole = user.vyaparRoles && user.vyaparRoles.some(role => 
            role.vyaparId.toString() === vyaparId
        );

        if (!hasVyaparRole) {
            return errorResponse(res, 'You do not have permission to access this business', 403);
        }

        // Get the Vyapar details
        const vyapar = await JainVyapar.findOne({
            _id: vyaparId,
            status: 'active'
        });

        if (!vyapar) {
            return errorResponse(res, 'Business not found or not active', 404);
        }

        return successResponse(res, {
            message: 'Access granted',
            vyaparId: vyapar._id,
            businessName: vyapar.businessName
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Get business details
const getVyaparDetails = async (req, res) => {
    try {
        const { vyaparId } = req.params;
        const vyapar = await JainVyapar.findById(vyaparId)
            .select('-accessCredentials.accessKey');

        if (!vyapar) {
            return errorResponse(res, 'Business not found', 404);
        }

        return successResponse(res, vyapar);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Update business details
const updateVyaparDetails = async (req, res) => {
    try {
        const { vyaparId } = req.params;
        const updateData = req.body;

        // Remove sensitive fields from update
        delete updateData.accessCredentials;
        delete updateData.status;
        delete updateData.payment;
        delete updateData.approvedBy;

        const vyapar = await JainVyapar.findById(vyaparId);
        if (!vyapar) {
            return errorResponse(res, 'Business not found', 404);
        }

        // Handle file updates if any
        if (req.files) {
            const deletePromises = [];
            
            if (req.files.entityPhoto) {
                // Delete old photos from S3
                vyapar.photos.forEach(photo => {
                    deletePromises.push(
                        s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.AWS_BUCKET_NAME,
                            Key: extractS3KeyFromUrl(photo.url)
                        }))
                    );
                });
                
                updateData.photos = req.files.entityPhoto.map(file => ({
                    url: file.location,
                    type: file.mimetype.startsWith('image/') ? 'image' : 'other'
                }));
            }

            if (req.files.entityDocuments) {
                // Delete old documents from S3
                vyapar.documents.forEach(doc => {
                    deletePromises.push(
                        s3Client.send(new DeleteObjectCommand({
                            Bucket: process.env.AWS_BUCKET_NAME,
                            Key: extractS3KeyFromUrl(doc.url)
                        }))
                    );
                });
                
                updateData.documents = req.files.entityDocuments.map(file => ({
                    url: file.location,
                    type: file.mimetype === 'application/pdf' ? 'pdf' : 'other'
                }));
            }

            await Promise.all(deletePromises);
        }

        Object.assign(vyapar, updateData);
        await vyapar.save();

        return successResponse(res, {
            message: 'Business details updated successfully',
            vyapar
        });
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Get businesses by city
const getCityVyapars = async (req, res) => {
    try {
        const { citySanghId } = req.params;
        const vyapars = await JainVyapar.find({
            citySanghId,
            status: 'active'
        }).select('businessName businessType productCategory location photos');

        return successResponse(res, vyapars);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

// Get all businesses (public)
const getAllVyapars = async (req, res) => {
    try {
        const businesses = await JainVyapar.find(
            { status: 'active', applicationStatus: 'approved' },
            'businessName businessType productCategory location businessPhotos'
        ).sort({ businessName: 1 });

        return successResponse(res, businesses);
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
};

module.exports = {
    getAvailableCities,
    submitVyaparApplication,
    getPendingApplications,
    reviewApplication,
    vyaparLogin,
    getVyaparDetails,
    updateVyaparDetails,
    getCityVyapars,
    getAllVyapars
};
