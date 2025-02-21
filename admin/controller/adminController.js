const asyncHandler = require("express-async-handler");
const Admin = require("../model/adminModel");


// register Api
const adminUser = asyncHandler(async (req, res) =>{
  const email = req.body.email;
  console.log(email);
  const findUser = await Admin.find({email: email});
  console.log(findUser);
    if(findUser.length===0){
    const newUser = await Admin.create(req.body);
    res.json(newUser);
  } else {
    throw new Error("User Already Exists");
  }
});

// LOGIN API 
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  const admin = await Admin.findOne({ email: email });

  if (admin) {
    if (admin.password === password) {
      res.json({ message: 'Login successful', admin: admin });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});



  module.exports = {
    adminUser,
    adminLogin
  };