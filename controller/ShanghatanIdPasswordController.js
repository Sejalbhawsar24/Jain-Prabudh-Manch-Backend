const ShanghatanIdPassword = require('../model/ShanghatanIdPassword');

// Register a new user
const registerShanghatan = async (req, res) => {
    try {
        const { userName, password } = req.body;
        const existingUser = await ShanghatanIdPassword.findOne({ userName });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        // Create new user
        const newUser = new ShanghatanIdPassword({ userName, password });
        await newUser.save();
        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Login user
const loginShanghatan = async (req, res) => {
    try {
        const { userName, password } = req.body;
        const user = await ShanghatanIdPassword.findOne({ userName });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Check password
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
        res.status(200).json({ success: true, message: 'Login successful', user });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

//  Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await ShanghatanIdPassword.find();
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

//  Get user by ID
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await ShanghatanIdPassword.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = { registerShanghatan, loginShanghatan, getAllUsers, getUserById };
