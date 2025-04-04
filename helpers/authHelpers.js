const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      sanghRoles: user.sanghRoles || [],
      panchRoles: user.panchRoles || [],
      tirthRoles: user.tirthRoles || [],
      vyaparRoles: user.vyaparRoles || [],
      sadhuRoles: user.sadhuRoles || []
    },
    process.env.JWT_SECRET
 
  );
};

module.exports = { generateToken };