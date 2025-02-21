const Panchayat = require('../model/PanchayatModel'); // Adjust path to your Panchayat model

// Create a new Panchayat
const createPanchayat = async (req, res) => {
  try {
    const processedPanchayat = { ...req.body };
    // Add unitId based on the selected unitType
    if (processedPanchayat.unitType) {
      let unitId = '';
      // Logic to set the unitId based on the unitType
      switch (processedPanchayat.unitType) {
        case 'विश्व इकाई':
          unitId = 'W-Jain Prabudh Manch';
          break;
        case 'देश इकाई':
          unitId = 'IND-Jain Prabudh Manch';
          break;
        case 'राज्य इकाई':
          unitId = 'State-Jain Prabudh Manch';
          break;
        case 'जिला इकाई':
          unitId = 'Dis-Jain Prabudh Manch';
          break;
        case 'शहर इकाई':
          unitId = 'City-Jain Prabudh Manch';
          break;
        default:
          unitId = 'Unknown - Jain Prabudh Manch';
      }
      // Add the generated unitId to the processed data
      processedPanchayat.unitId = unitId;
    }
    // List of panch keys to process
    const panchKeys = ['panch1', 'panch2', 'panch3', 'panch4', 'panch5'];
    panchKeys.forEach((key) => {
      if (processedPanchayat[key]) {
        const { firstName, lastName } = processedPanchayat[key];
        processedPanchayat[key].firstName = firstName.trim();
        if (lastName) {
          if (lastName.toLowerCase() === 'jain' || !lastName.trim()) {
            processedPanchayat[key].lastName = 'Jain';
          } else {
            processedPanchayat[key].lastName = `Jain (${lastName.trim()})`;
          }
        }
      }
    });

    // Save the processed Panchayat
    const newPanchayat = new Panchayat(processedPanchayat);
    const savedPanchayat = await newPanchayat.save();

    res.status(201).json({
      success: true,
      message: 'Panchayat created successfully',
      data: savedPanchayat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating Panchayat',
      error: error.message,
    });
  }
};

// Get all Panchayats
const getAllPanchayats = async (req, res) => {
  try {
    const panchayats = await Panchayat.find();
    res.status(200).json({
      success: true,
      message: 'Panchayats retrieved successfully',
      data: panchayats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving Panchayats',
      error: error.message,
    });
  }
};

// Get a Panchayat by ID
const getPanchayatById = async (req, res) => {
  try {
    const { userId, panchayatId } = req.params;
    const panchayat = await Panchayat.findOne({
      _id: panchayatId,
      userId: userId,
    });
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found for the provided user ID and Panchayat ID',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Panchayat retrieved successfully',
      data: panchayat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving Panchayat',
      error: error.message,
    });
  }
};

// Update a Panchayat by ID
const updatePanchayat = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPanchayat = await Panchayat.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedPanchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Panchayat updated successfully',
      data: updatedPanchayat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating Panchayat',
      error: error.message,
    });
  }
};

module.exports = {
  createPanchayat,
  getAllPanchayats,
  getPanchayatById,
  updatePanchayat,
};
