const JainVyapar = require('../model/jainvyaparModel');

// Create a new entry
exports.createJainVyapar = async (req, res) => {
  try {
    const { promotorId, vyaparType, productCategory, imageUrl } = req.body;

    if (!promotorId || !vyaparType || !productCategory ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newEntry = new JainVyapar({ promotorId, vyaparType, productCategory, imageUrl });
    const savedEntry = await newEntry.save();

    res.status(201).json({ message: 'Entry created successfully', data: savedEntry });
  } catch (error) {
    res.status(500).json({ message: 'Error creating entry', error: error.message });
  }
};

// Get all entries
exports.getAllJainVyapar = async (req, res) => {
  try {
    const entries = await JainVyapar.find();
    res.status(200).json({ message: 'Entries retrieved successfully', data: entries });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving entries', error: error.message });
  }
};

// Get a single entry by ID
exports.getJainVyaparById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JainVyapar.findById(id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.status(200).json({ message: 'Entry retrieved successfully', data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving entry', error: error.message });
  }
};

// Update an entry by ID
exports.updateJainVyapar = async (req, res) => {
  try {
    const { id } = req.params;
    const { promotorId, vyaparType, productCategory, imageUrl } = req.body;

    const updatedEntry = await JainVyapar.findByIdAndUpdate(
      id,
      { promotorId, vyaparType, productCategory, imageUrl },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.status(200).json({ message: 'Entry updated successfully', data: updatedEntry });
  } catch (error) {
    res.status(500).json({ message: 'Error updating entry', error: error.message });
  }
};
