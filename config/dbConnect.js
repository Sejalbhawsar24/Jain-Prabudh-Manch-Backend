const mongoose = require("mongoose")

const dbConnect = async () => {
   try {
       const conn = await mongoose.connect(process.env.MONGODB_URL, {
           maxPoolSize: 15, 
           serverSelectionTimeoutMS: 5000, 
           socketTimeoutMS: 45000, 
           family: 4 
       });
       console.log(`MongoDB Connected: ${conn.connection.host}`);
       
       
       mongoose.connection.on('error', (err) => {
           console.error(`MongoDB connection error: ${err}`);
       });
       
       // Handle disconnection
       mongoose.connection.on('disconnected', () => {
           console.log('MongoDB disconnected, attempting to reconnect...');
       });
   }
   catch(error) {
    console.error(`MongoDB connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
   }
}

module.exports = dbConnect;
