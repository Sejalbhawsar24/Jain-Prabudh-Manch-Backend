const JainVyapar = require('../model/JainVyaparIdPassword');

// Create Jain Vyapar ID and Password
exports.createJainIdPass = async (req, res) => {
  const { loginId, password, userId } = req.body;
  if (!loginId || !password || !userId) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    // Check if loginId already exists
    const existingJainVyapar = await JainVyapar.findOne({ loginId });
    if (existingJainVyapar) {
      return res.status(400).json({ message: 'Login ID already exists.' });
    }
    // Create a new Jain Vyapar document
    const newJainVyapar = new JainVyapar({ loginId, password, userId });
    await newJainVyapar.save();
    res.status(201).json({ message: 'Jain Vyapar ID and Password created successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error.' });
  }
};

// Get all Jain Vyapar entries
exports.getAllJainVyapars = async (req, res) => {
  try {
    const jainVyapars = await JainVyapar.find().populate('userId', 'name email');
    res.status(200).json(jainVyapars);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error.' });
  }
};

// Get a specific Jain Vyapar by ID
exports.getJainVyaparById = async (req, res) => {
  const { id } = req.params;
  try {
    const jainVyapar = await JainVyapar.findById(id).populate('userId', 'name email');
    if (!jainVyapar) {
      return res.status(404).json({ message: 'Jain Vyapar not found.' });
    }
    res.status(200).json(jainVyapar);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error.' });
  }
};

// Delete a Jain Vyapar entry
exports.deleteJainVyapar = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedJainVyapar = await JainVyapar.findByIdAndDelete(id);
    if (!deletedJainVyapar) {
      return res.status(404).json({ message: 'Jain Vyapar not found.' });
    }
    res.status(200).json({ message: 'Jain Vyapar deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error.' });
  }
};
