const User = require("../../model/UserRegistrationModels/userModel");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const dotenv = require("dotenv")
dotenv.config();
const { userValidation } = require('../../validators/validations');
const { errorResponse, successResponse } = require("../../utils/apiResponse");
const { generateToken } = require("../../helpers/authHelpers");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, 
    message: { error: 'Too many login attempts. Please try again later.' }
});

// Register new user with enhanced security
const registerUser = [
    userValidation.register,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array()
            });
        }
        const { firstName, lastName, phoneNumber, password, birthDate, gender, city } = req.body;
        // Check if user already exists
        const existingUser = await User.findOne({ phoneNumber });
        // if (existingUser) {
        //     return errorResponse(res, 'User with this phone number already exists', 400);
        // }
        // Enhanced name formatting
        const fullName = lastName.toLowerCase() === 'jain' 
            ? `${firstName} Jain`
            : `${firstName} Jain (${lastName})`;

        const newUser = await User.create({
            firstName,
            lastName,
            fullName,
            phoneNumber,
            password,
            birthDate,
            gender,
            city,
            lastLogin: new Date(),
            accountStatus: 'active',
            registrationStep: 'initial' // Track registration progress
        });
        const token = generateToken(newUser);
        newUser.token = token;
        await newUser.save();
        const userResponse = newUser.toObject();
        delete userResponse.password;
        delete userResponse.__v;
        return successResponse(
            res, 
            {
                user: userResponse,
                token,
                nextStep: 'profile_picture' 
            },
            'User registered successfully',
            201
        );
    })
];

const loginUser = asyncHandler(async (req, res) => {
    const { fullName, password } = req.body;

    // Name ko split karna (multiple spaces handle hoga)
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts.shift();
    const lastName = nameParts.join(' '); // Baaki sab lastName me

    // Database me firstName aur lastName se user find karna
    const user = await User.findOne({ firstName, lastName });

    if (user && (await user.isPasswordMatched(password))) {
        const token = generateToken(user);
        user.token = token;
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            token: token
        });
    } else {
        res.status(401).json({
            success: false,
            message: "Invalid full name or password"
        });
    }
});

// Enhanced user search with pagination and filters
const getAllUsers = asyncHandler(async (req, res) => {
    const { search, page = 1, limit = 10, city, gender, role } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    // Search Query
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { fullName: searchRegex }
        ];
    }

    // City Filter
    if (city) query.city = new RegExp(city, 'i');
    
    // Gender Filter
    if (gender) query.gender = gender;
    
    // Role Filter (New)
    if (role) query.role = role;

    console.log("Final Query:", query); // Debugging ke liye

    const users = await User.find(query)
        .select('-password -__v')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
        users: users || [],
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total
    });
});


// Enhanced user profile retrieval
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const user = await User.findById(id)
        .select('-password -__v')
        .populate('friends', 'firstName lastName profilePicture')
        .populate({
            path: 'posts',
            select: '-__v',
            options: { sort: { createdAt: -1 } }
        })
        .populate('story', 'content createdAt');

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const userResponse = user.toObject();
    userResponse.friendCount = user.friends.length;
    userResponse.postCount = user.posts.length;

    res.json(userResponse);
});

// Enhanced user update with validation
const updateUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const newProfilePicture = req.file ? req.file.location : null; // ✅ AWS S3 image URL

    if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Unauthorized: No valid token' });
    }

    if (req.user._id.toString() !== id) {
        return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
    }

    delete updates.password;
    delete updates.token;

    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // ✅ Delete Old Profile Picture from S3 If New One is Uploaded
    if (newProfilePicture && user.profilePicture && user.profilePicture.startsWith("https")) {
        const oldImageKey = user.profilePicture.split('/').pop(); 
        const params = { Bucket: process.env.AWS_S3_BUCKET_NAME, Key: oldImageKey };
        try {
            await s3.deleteObject(params).promise();
            console.log('✅ Old profile picture deleted from S3:', oldImageKey);
        } catch (error) {
            console.error('❌ Error deleting old profile picture:', error);
        }
    }

    // ✅ Update User Document with New Data
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: { ...updates, ...(newProfilePicture && { profilePicture: newProfilePicture }) } },
        { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
    });
});



// Enhanced privacy settings
const updatePrivacy = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
        id,
        { privacy: 'public' },
        { new: true }
    ).select('-password -__v');

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({
        message: 'Privacy settings updated successfully',
        user
    });
});

// Upload profile picture with registration step tracking
const uploadProfilePicture = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        let imageUrl = null;

        if (req.file) {
            imageUrl = req.file.location; // S3 URL of the uploaded file
        }

        const updateData = {
            registrationStep: 'completed',
            ...(imageUrl && { profilePicture: imageUrl })
        };

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password -__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: imageUrl ? 'Profile picture uploaded successfully' : 'Profile picture upload skipped',
            data: {
                user,
                registrationComplete: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing profile picture',
            error: error.message
        });
    }
});

// Skip profile picture upload
const skipProfilePicture = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findByIdAndUpdate(
            userId,
            { registrationStep: 'completed' },
            { new: true }
        ).select('-password -__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Profile picture upload skipped',
            data: {
                user,
                registrationComplete: true
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error skipping profile picture',
            error: error.message
        });
    }
});
const logoutUser = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return errorResponse(res, "User not found", 404);
        }

        // Clear tokens
        user.token = null;
        await user.save();

        return successResponse(
            res, 
            {},
            "Logged out successfully",
            200
        );
    } catch (error) {
        return errorResponse(res, "Logout failed", 500, error.message);
    }
});

// Search users by name, email, or phone - for suggestion/complaint recipient selection
const searchUsers = asyncHandler(async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.length < 3) {
            return errorResponse(res, 'Search query must be at least 3 characters', 400);
        }
        
        const users = await User.find({
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                {fullName : { $regex: query, $options: 'i' }},
                { phoneNumber: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).select('_id firstName lastName phoneNumber email roles profilePicture')
          .limit(10);
        
        // Format user data for frontend
        const formattedUsers = users.map(user => ({
            _id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phoneNumber,
            email: user.email || '',
            roles: user.role || [],
            profilePicture: user.profilePicture || ''
        }));
        
        return successResponse(res, formattedUsers, 'Users retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Register new user
// const registerUser = asyncHandler(async (req, res) => {
//     const { firstName, lastName } = req.body;
//     let fullName = '';
//     // Check if last name is 'Jain' or something else
//     if (firstName && lastName) {
//         if (lastName.toLowerCase() === 'jain') {
//             fullName = `${firstName} Jain`;
//         } else {
//             fullName = `${firstName} Jain (${lastName})`;
//         }
//     } else if (firstName) {
//         fullName = `${firstName} Jain`; 
//     } else if (lastName) {
//         fullName = `Jain (${lastName})`; 
//     } else {
//         fullName = 'Jain'; 
//     }
//     req.body.fullName = fullName;
//     const newUser = await User.create(req.body);
//     const token = jwt.sign(
//         { _id: newUser._id, firstName: newUser.firstName, lastName: newUser.lastName },
//         'e6236723675',
//         { expiresIn: '30h' }
//     );
//     console.log("Register user token", token);
//     newUser.token = token;
//     await newUser.save();
//     res.json({
//         message: 'User registered successfully',
//         user: newUser,
//         token: token,
//     });
// });

// const loginUser = asyncHandler(async (req, res) => {
//     const { fullName, password } = req.body;
//     if (!fullName || !password) {
//         return res.status(400).json({ error: 'Full name and password are required' });
//     }
//     const [firstName, ...lastNameArray] = fullName.split(' ');
//     const lastName = lastNameArray.join(' ');
//     if (!firstName || !lastName) {
//         return res.status(400).json({ error: 'Full name must include both first and last names' });
//     }
//     const user = await User.findOne({ firstName, lastName });
//     if (user && await user.isPasswordMatched(password)) {
//         res.json({
//             message: 'Successful login',
//             _id: user._id,
//             firstName: user.firstName,
//             lastName: user.lastName,
//             fullName: user.fullName,
//             birthDate: user.birthDate,
//             phoneNumber: user.phoneNumber,
//             gender: user.gender,
//             profilePicture: user.profilePicture,
//             createdAt: user.createdAt
//         });
//     } else {
//         res.status(401).json({ error: 'Invalid full name or password' });
//     }
// });

// Get all users
// const getAllUsers = asyncHandler(async (req, res) => {
//     const users = await User.find({});
//     res.json(users);
//     console.log(users)
// });

// Get all users with search functionality
// const getAllUsers = asyncHandler(async (req, res) => {
//     const { search } = req.query;

//     let query = {};
//     if (search) {
//         const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
//         query = {
//             $or: [
//                 { firstName: searchRegex },
//                 { lastName: searchRegex },
//                 { fullName: searchRegex },
//             ],
//         };
//     }
//     try {
//         const users = await User.find(query);
//         res.json(users);
//         } catch (error) {
//         res.status(500).json({ message: 'Error fetching users', error: error.message });
//     }
// });

// const getUserById = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     try {
//         // Populate fullName, friends, and posts
//         const user = await User.findById(id)
//             .populate("friends", "fullName email") 
//             .populate("posts");
//         if (!user) {
//             return res.status(404).json({ error: "User not found" });
//         }
//         // Count the number of posts
//         const postCount = user.posts?.length || 0;
//         // Return user data along with post count
//         res.json({
//             ...user.toObject(),
//             postCount,
//         });
//     } catch (error) {
//         console.error("Error fetching user:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// // Update user by ID
// const updateUserById = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }
//     const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
//     res.json(updatedUser);
// });

// // Update Privacy Setting
// const updatePrivacy = async (req, res) => {
//     const { id } = req.params;
//     const { privacy } = req.body;
//     try {
//       const user = await User.findByIdAndUpdate(id, { privacy }, { new: true });
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
//       res.status(200).json({ message: 'Privacy updated successfully', user });
//     } catch (error) {
//       res.status(500).json({ message: 'Server error', error });
//     }
//   };
  
module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUserById,
    updatePrivacy,
    uploadProfilePicture,
    skipProfilePicture,
    logoutUser,
    searchUsers
};