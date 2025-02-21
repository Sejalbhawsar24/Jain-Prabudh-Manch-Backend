const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({

  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
      
  email: {
    type: String,
  },
 
  password: {
    type: String,

  },
  role: {
    type :String,
    default:"admin",
  },
  


},
{
    timestamps:true,
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;

