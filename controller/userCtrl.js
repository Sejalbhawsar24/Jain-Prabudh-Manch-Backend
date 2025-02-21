const User = require("../model/userModel");
const asyncHandler = require("express-async-handler");
const jwt = require('jsonwebtoken');

// Register new user
const registerUser = asyncHandler(async (req, res) => {
    const { firstName, lastName } = req.body;
    let fullName = '';
    // Check if last name is 'Jain' or something else
    if (firstName && lastName) {
        if (lastName.toLowerCase() === 'jain') {
            fullName = `${firstName} Jain`; // If last name is Jain, keep it simple
        } else {
            fullName = `${firstName} Jain (${lastName})`;
        }
    } else if (firstName) {
        fullName = `${firstName} Jain`; 
    } else if (lastName) {
        fullName = `Jain (${lastName})`; 
    } else {
        fullName = 'Jain'; 
    }
    req.body.fullName = fullName;
    const newUser = await User.create(req.body);
    const token = jwt.sign(
        { _id: newUser._id, firstName: newUser.firstName, lastName: newUser.lastName },
        'e6236723675',
        { expiresIn: '30h' }
    );
    console.log("Register user token", token);
    newUser.token = token;
    await newUser.save();
    res.json({
        message: 'User registered successfully',
        user: newUser,
        token: token,
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { fullName, password } = req.body;
    if (!fullName || !password) {
        return res.status(400).json({ error: 'Full name and password are required' });
    }
    const [firstName, ...lastNameArray] = fullName.split(' ');
    const lastName = lastNameArray.join(' ');
    if (!firstName || !lastName) {
        return res.status(400).json({ error: 'Full name must include both first and last names' });
    }
    const user = await User.findOne({ firstName, lastName });
    if (user && await user.isPasswordMatched(password)) {
        res.json({
            message: 'Successful login',
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            birthDate: user.birthDate,
            phoneNumber: user.phoneNumber,
            gender: user.gender,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt
        });
    } else {
        res.status(401).json({ error: 'Invalid full name or password' });
    }
});

// Get all users
// const getAllUsers = asyncHandler(async (req, res) => {
//     const users = await User.find({});
//     res.json(users);
//     console.log(users)
// });

// Get all users with search functionality
const getAllUsers = asyncHandler(async (req, res) => {
    const { search } = req.query;

    let query = {};
    if (search) {
        const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
        query = {
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { fullName: searchRegex },
            ],
        };
    }
    try {
        const users = await User.find(query);
        res.json(users);
        } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        // Populate fullName, friends, and posts
        const user = await User.findById(id)
            .populate("friends", "fullName email") 
            .populate("posts");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // Count the number of posts
        const postCount = user.posts?.length || 0;
        // Return user data along with post count
        res.json({
            ...user.toObject(),
            postCount,
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update user by ID
const updateUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedUser);
});

// Update Privacy Setting
const updatePrivacy = async (req, res) => {
    const { id } = req.params;
    const { privacy } = req.body;
    try {
      const user = await User.findByIdAndUpdate(id, { privacy }, { new: true });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'Privacy updated successfully', user });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  };
  
module.exports = {
    registerUser,
    getAllUsers,
    getUserById,
    updateUserById,
    loginUser,
    updatePrivacy
};
