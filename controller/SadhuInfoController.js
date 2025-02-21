const SadhuInfo = require('../model/SadhuInfoModel');

// Create a new SadhuInfo
const createSadhuInfo = async (req, res) => {
  try {
    const newSadhuInfo = new SadhuInfo(req.body);
    const savedSadhuInfo = await newSadhuInfo.save();
    res.status(201).json(savedSadhuInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get all SadhuInfo records
const getAllSadhuInfo = async (req, res) => {
    try {
      const sadhuInfoList = await SadhuInfo.find().populate('cityPromoterId', 'name');
      res.status(200).json(sadhuInfoList);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  
  // Get a SadhuInfo by ID
  const getSadhuInfoById = async (req, res) => {
    try {
      const sadhuInfo = await SadhuInfo.findById(req.params.id).populate('cityPromoterId', 'name');
      if (!sadhuInfo) {
        return res.status(404).json({ message: 'SadhuInfo not found' });
      }
      res.status(200).json(sadhuInfo);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
module.exports = {
  createSadhuInfo,
  getAllSadhuInfo,
  getSadhuInfoById
};
