const VyavahikBiodata = require('../model/VyavahikBiodata'); // मॉडल को इंपोर्ट करें

// Create API
const createBiodata = async (req, res) => {
  try {
    const biodata = new VyavahikBiodata(req.body);
    await biodata.save();
    res.status(201).json({
      success: true,
      message: 'Biodata created successfully!',
      data: biodata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating biodata',
      error: error.message,
    });
  }
};

// Update API
const updateBiodata = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBiodata = await VyavahikBiodata.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!updatedBiodata) {
      return res.status(404).json({
        success: false,
        message: 'Biodata not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Biodata updated successfully!',
      data: updatedBiodata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating biodata',
      error: error.message,
    });
  }
};

// Get Single Biodata API
const getBiodata = async (req, res) => {
  try {
    const { id } = req.params;
    const biodata = await VyavahikBiodata.findById(id);
    if (!biodata) {
      return res.status(404).json({
        success: false,
        message: 'Biodata not found',
      });
    }
    res.status(200).json({
      success: true,
      data: biodata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching biodata',
      error: error.message,
    });
  }
};

// Get All Biodatas API
const getAllBiodatas = async (req, res) => {
  try {
    const biodatas = await VyavahikBiodata.find();
    res.status(200).json({
      success: true,
      data: biodatas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching biodatas',
      error: error.message,
    });
  }
};

module.exports = {
  createBiodata,
  updateBiodata,
  getBiodata,
  getAllBiodatas,
};
