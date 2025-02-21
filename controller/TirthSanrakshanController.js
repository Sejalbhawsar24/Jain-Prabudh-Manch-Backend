const TirthSanrakshan  = require('../model/TirthSanrakshan');

// Create a new TirthSanrakshan record
exports.createTirthSanrakshan = async (req, res) => {
  try {
    const newTirthSanrakshan = new TirthSanrakshan(req.body);
    const savedTirthSanrakshan = await newTirthSanrakshan.save();
    res.status(201).json(savedTirthSanrakshan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all TirthSanrakshan records
exports.getAllTirthSanrakshan = async (req, res) => {
  try {
    const tirthSanrakshans = await TirthSanrakshan.find();
    res.status(200).json(tirthSanrakshans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get TirthSanrakshan by ID
exports.getTirthSanrakshanById = async (req, res) => {
  try {
    const { id } = req.params;
    const tirthSanrakshan = await TirthSanrakshan.findById(id);
    if (!tirthSanrakshan) {
      return res.status(404).json({ message: 'TirthSanrakshan not found' });
    }
    res.status(200).json(tirthSanrakshan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
