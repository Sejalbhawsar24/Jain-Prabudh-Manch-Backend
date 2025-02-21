const User = require('../model/userModel'); // Adjust the path to match your project structure
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

// Log middleware function
const logMiddleware = (req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
};
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    jwt.verify(token, 'e6236723675', (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = decoded;
      next();
    });
  };

// Auth middleware function
const authMiddleware = asyncHandler(async (req, res, next) => {
    let token;
    const secretKey = "e6236723675";

    if (req?.headers?.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(" ")[1];
        try {
            if (token) {
                const decoded = jwt.verify(token, secretKey);
                const user = await User.findById(decoded?.id);
                if (!user) {
                    return res.status(401).json({ status: "fail", message: "User not found." });
                }
                req.user = user;
                next();
            } else {
                return res.status(401).json({ status: "fail", message: "Invalid token." });
            }
        } catch (error) {
            return res.status(401).json({ status: "fail", message: "Token expired or invalid.", error: error.message });
        }
    } else {
        return res.status(401).json({ status: "fail", message: "No token attached to headers" });
    }
});

module.exports = {
    logMiddleware,
    authMiddleware,
    authenticate
};
