const Unit = require('../model/unitModel'); // Unit मॉडल आयात करें

// Helper function to format names
const formatName = (firstname, surname) => {
  // Trim the firstname, no "Jain" will be added
  const formattedFirstname = firstname.trim();
  // If surname is "Jain" or empty, only show "Jain" in surname
  let formattedSurname = surname.trim();
  if (formattedSurname.toLowerCase() === 'jain' || !formattedSurname) {
    formattedSurname = 'Jain'; // Only "Jain" if surname is "Jain" or empty
  } else {
    formattedSurname = `Jain (${formattedSurname})`; // If a different surname, append it in parentheses
  }
  return {
    formattedFirstname: formattedFirstname,
    formattedSurname: formattedSurname,
  };
};

// Create a new unit
exports.createUnit = async (req, res) => {
  try {
    const unitData = req.body;
    // Validate input
    if (!unitData.unitType) {
      return res.status(400).json({
        success: false,
        message: 'Unit type is required',
      });
    }
    // Format president, secretary, and treasurer names
    ['president', 'secretary', 'treasurer'].forEach((role) => {
      if (unitData[role]) {
        const { formattedFirstname, formattedSurname } = formatName(
          unitData[role].firstname || '',
          unitData[role].surname || ''
        );
        unitData[role].firstname = formattedFirstname;
        unitData[role].surname = formattedSurname;
      }
    });
    // Format member names
    if (unitData.members && Array.isArray(unitData.members)) {
      unitData.members = unitData.members.map((member) => {
        const { formattedFirstname, formattedSurname } = formatName(
          member.firstname || '',
          member.surname || ''
        );
        return {
          ...member,
          firstname: formattedFirstname,
          surname: formattedSurname,
        };
      });
    }
    // Generate a unique unit ID if not provided
    if (!unitData.unitId) {
      const baseName = 'Jain Prabudh Manch';
      switch (unitData.unitType) {
        case 'विश्व इकाई':
          unitData.unitId = `W-${baseName}`;
          break;
        case 'देश इकाई':
          unitData.unitId = `IND-${baseName}`;
          break;
        case 'राज्य इकाई':
          unitData.unitId = `State-${baseName}`;
          break;
        case 'जिला इकाई':
          unitData.unitId = `Dis-${baseName}`;
          break;
        case 'शहर इकाई':
          unitData.unitId = `City-${baseName}`;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid unit type',
          });
      }
    }
    const newUnit = new Unit(unitData);
    await newUnit.save();

    return res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: newUnit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create unit',
      error: error.message,
    });
  }
};

// Get all units
exports.getAllUnits = async (req, res) => {
  try {
    const units = await Unit.find();
    return res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
      error: error.message,
    });
  }
};

// Get unit by sanghtanId and userId
exports.getUnitById = async (req, res) => {
  try {
    const { id: sanghtanId } = req.params;
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const unit = await Unit.findOne({ _id: sanghtanId, userId });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    return res.status(200).json({ success: true, data: unit });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unit', error: error.message });
  }
};

// Update unit by ID and userId
exports.updateUnit = async (req, res) => {
  try {
    const { id: sanghtanId } = req.params;
    const { userId } = req.query;
    const updateData = req.body;
    const updatedUnit = await Unit.findOneAndUpdate(
      { _id: sanghtanId, userId },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedUnit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Unit updated successfully',
      data: updatedUnit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      error: error.message,
    });
  }
};

