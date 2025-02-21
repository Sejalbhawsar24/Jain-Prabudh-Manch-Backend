const JainAdharLogin = require('../model/jainAdharLoginModel');

// Register a new user
exports.createUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Check if username already exists
    const existingUser = await JainAdharLogin.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    // Save new user
    const newUser = new JainAdharLogin({ username, password });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    // Find user by username
    const user = await JainAdharLogin.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await JainAdharLogin.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await JainAdharLogin.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

// Update user by ID
exports.updateUserById = async (req, res) => {
  try {
    const { username, password } = req.body;
    const updatedUser = await JainAdharLogin.findByIdAndUpdate(
      req.params.id,
      { username, password },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
  }
};
