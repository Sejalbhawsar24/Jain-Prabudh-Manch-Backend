const express = require("express");
const http = require("http");  // Import http module
const dbConnect = require("./config/dbConnect");
const app = express();
const socketIo = require('socket.io');
const dotenv = require("dotenv").config();
const PORT =  4000 ;
const path = require('path');
console.log(path.join(__dirname, "uploads"));
const upload = require('./middlewares/upload')
const bodyParser = require("body-parser");
const { notFound, errorHandler } = require("./middlewares/errorHandler");
const cors = require("cors");
const adminRouter = require('./admin/route/adminRoute');
const authRouter = require('./routes/authRoute')
const { logMiddleware } = require('./middlewares/authMiddlewares');
const jainAdharRouter = require('./routes/jainAdharRoute');
const friendshipRoutes = require('./routes/friendshipRoutes');
const postRoutes = require('./routes/postRoutes'); 
const unitRoutes = require('./routes/unitRoute');
const panchayatRoute = require('./routes/panchayatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const jainVyaparRoutes = require('./routes/jainVyaparRoutes');
const tirthSanrakshanRoute = require('./routes/TirthSanrakshanRoute');
const sadhuInfoRoutes = require('./routes/sadhuInfoRoutes');
const ShanghatanIdPasswordRoute = require('./routes/ShanghatanIdPasswordRoute')
const panchayatIdPasswordRoutes = require('./routes/panchayatIdPasswordRoutes');
const tirthIdPasswordRoutes = require('./routes/tirthIdPasswordRoutes')
const jainVyaparRoute = require('./routes/JainVyaparIdPassRoutes')
const sadhuRoutes = require('./routes/sadhuRoutes');
const biodataRoutes = require('./routes/biodataRoutes');
const groupChatRoutes = require('./routes/groupChatRoutes');
const rojgarRoutes = require('./routes/rojgarRoute');
const reportingRoutes = require('./routes/reportingRoutes')
const suggestionComplaintRoutes = require('./routes/suggestionComplaintRoutes')
const granthRoutes = require('./routes/jainGranthRoutes');
const jainItihasRoutes = require('./routes/jainItihasRoutes');
const jainAdharRoutes = require('./routes/jainAdharLoginRoutes');
const storyRoutes = require('./routes/storyRoutes');
const notificationRoutes = require('./routes/notificationRoutes')
const Story = require('./model/storyModel')
const govtYojanaRoutes = require('./routes/govtYojanaRoutes')
dbConnect();
app.use(cors());
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json());

  
// Function to delete expired stories every hour
const deleteExpiredStories = async () => {
  try {
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Story.deleteMany({ createdAt: { $lt: expiredTime } });
      console.log(`Deleted ${result.deletedCount} expired stories`);
  } catch (error) {
      console.error("Error deleting expired stories:", error);
  }
};
// Run the cleanup job every hour
setInterval(deleteExpiredStories, 60 * 60 * 1000);

app.use(logMiddleware);
app.use("/api/user",authRouter)
app.use("/api/JainAadhar",jainAdharRouter);
app.use("/api/friendship", friendshipRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/units',unitRoutes );
app.use('/api/panchayat',panchayatRoute );
app.use('/api/messages', messageRoutes);
app.use('/api/jain-vyapar', jainVyaparRoutes);
app.use('/api/tirthsanrakshan', tirthSanrakshanRoute);
app.use('/api/sadhuInfo', sadhuInfoRoutes);
app.use('/api/Shanghatan', ShanghatanIdPasswordRoute);
app.use('/api/panchayat', panchayatIdPasswordRoutes);
app.use('/api/tirth', tirthIdPasswordRoutes);
app.use('/api/jainvyapar', jainVyaparRoute);
app.use('/api/sadhu', sadhuRoutes);
app.use('/api/biodata', biodataRoutes);
app.use("/api/rojgar", rojgarRoutes);
app.use('/api/groupchat', groupChatRoutes);
app.use('/api/reports', reportingRoutes);
app.use('/api/suggestion-complaint', suggestionComplaintRoutes);
app.use("/api/granth", granthRoutes);
app.use("/api/jainitihas", jainItihasRoutes);
app.use('/api/jainadhar', jainAdharRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/yojana', govtYojanaRoutes);

// Admin API routes
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running at PORT ${PORT}`);
});
