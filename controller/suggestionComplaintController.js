const SuggestionComplaint = require('../model/SuggestionComplaint');

//  Create Suggestion / Complaint
exports.createSuggestionComplaint = async (req, res) => {
  try {
    const { subject, description, sendTo } = req.body;
    if (!subject || !description || !sendTo) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const newComplaint = new SuggestionComplaint({ subject, description, sendTo });
    await newComplaint.save();
    res.status(201).json({ message: 'Suggestion/Complaint submitted successfully', newComplaint });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};

//  Get All Suggestions / Complaints
exports.getAllSuggestionsComplaints = async (req, res) => {
  try {
    const complaints = await SuggestionComplaint.find().sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};

// Get Single Suggestion / Complaint by ID
exports.getSuggestionComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await SuggestionComplaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: 'Suggestion/Complaint not found' });
    }
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};

//  Delete Suggestion / Complaint
exports.deleteSuggestionComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedComplaint = await SuggestionComplaint.findByIdAndDelete(id);
    if (!deletedComplaint) {
      return res.status(404).json({ message: 'Suggestion/Complaint not found' });
    }
    res.status(200).json({ message: 'Suggestion/Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error });
  }
};
