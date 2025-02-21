const JainAadhar = require('../model/jainAadharModel');

// Create Jain Aadhar API
exports.createJainAadhar = async (req, res) => {
  try {
    let { name } = req.body;
    if (name) {
      const nameParts = name.split(" ");
      const lastName = nameParts[nameParts.length - 1];
      if (lastName.toLowerCase() !== "JAIN") {
        name = `${nameParts.slice(0, -1).join(" ")} JAIN (${lastName})`; 
      }
    }
    const newJainAadhar = new JainAadhar({ ...req.body, name });
    const savedData = await newJainAadhar.save();
    res.status(201).json({ success: true, data: savedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Jain Aadhar Records
exports.getAllJainAadhar = async (req, res) => {
  try {
    const allRecords = await JainAadhar.find();
    res.status(200).json({ success: true, data: allRecords });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Jain Aadhar by ID
exports.getJainAadharById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await JainAadhar.findById(id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Jain Aadhar by ID
exports.updateJainAadharById = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecord = await JainAadhar.findByIdAndUpdate(id, req.body, {
      new: true, 
      runValidators: true,
    });

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Jain Aadhar by ID
exports.deleteJainAadharById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await JainAadhar.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
