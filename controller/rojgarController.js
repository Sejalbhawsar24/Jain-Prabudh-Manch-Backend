// controllers/rojgarController.js
const Rojgar = require("../model/RojgarModel");
const RojgarRecruitee = require("../model/RojgarRecruiteeModel")

// Create a new job
exports.createJob = async (req, res) => {
  try {
    const { user, jainAadhar, jobName, jobDescription, experience, salary, age, language, gender, location, jobContact, jobEmail } = req.body;

    // Extract jobPost files from req.files
    let jobPost = [];
    if (req.files && req.files.jobPost) {
      jobPost = req.files.jobPost.map((file) => ({
        url: file.location,
        type: file.mimetype.startsWith("video/") ? "video" : "image",
      }));
    }

    console.log("Job Post Data:", jobPost);

    const newJob = new Rojgar({
      user,
      jainAadhar,
      jobName,
      jobDescription,
      experience,
      salary,
      age,
      language,
      gender,
      location,
      jobContact,
      jobEmail,
      jobPost,
    });

    const savedJob = await newJob.save();
    res.status(201).json(savedJob);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.createRecruitee = async (req, res) => {
  try {
    const { candidateName, mobile, email, address, gender, user } = req.body;
    const candidateResume = req.files?.candidateResume?.[0]?.location || "";
    //console.log(" Candidate Resume URL:", candidateResume); // Debugging
    const newRecruitee = new RojgarRecruitee({
      candidateName,
      mobile,
      email,
      address,
      gender,
      user,
      jobType: "recruitee",
      candidateResume,
    });
    await newRecruitee.save();
    res.status(201).json({ message: "Recruitee created successfully!", newRecruitee });
  } catch (error) {
    console.error("❌ Error creating recruitee:", error);
    res.status(500).json({ message: "Error creating recruitee", error: error.message });
  }
};

// Get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Rojgar.find().populate("user", "firstName lastName profilePicture");
    res.status(200).json(jobs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Get a job by ID
exports.getJobById = async (req, res) => {
  try {
    const job = await Rojgar.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a job by ID
exports.updateJob = async (req, res) => {
  try {
    const job = await Rojgar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a job by ID
exports.deleteJob = async (req, res) => {
  try {
    const job = await Rojgar.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
