const PanchayatIdPassword = require('../model/PanchayatIdPassword');


exports.register = async (req, res) => {
    try {
        const { userName, password } = req.body;
        // Check if user already exists
        const existingUser = await PanchayatIdPassword.findOne({ userName });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }
        const newUser = new PanchayatIdPassword({ userName, password });
        await newUser.save();
        res.status(201).json({ success: true, message: "Registration successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

// ✅ Login API
exports.login = async (req, res) => {
    try {
        const { userName, password } = req.body;
        // Check if user exists
        const user = await PanchayatIdPassword.findOne({ userName });
        if (!user || user.password !== password) {
            return res.status(400).json({ success: false, message: "Invalid username or password" });
        }
        res.status(200).json({ success: true, message: "Login successful" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error });
    }
};
