const { default: mongoose } = require("mongoose")

const dbConnect = () => {
   try{
       const conn = mongoose.connect(process.env.MONGODB_URL);
       console.log("Database Connected Successfully");
   }
   catch(error) {
   }
}
module.exports = dbConnect;
