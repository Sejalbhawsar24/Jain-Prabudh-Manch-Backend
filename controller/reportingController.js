const Reporting = require('../model/ReportingModel');

// Create a new report
exports.createReport = async (req, res) => {
    try {
      const newReport = new Reporting(req.body);
      await newReport.save();
      res.status(201).json(newReport);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  };
  

// Get a single report by ID
exports.getReportById = async (req, res) => {
  const { id } = req.params;

  try {
    const report = await Reporting.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reports
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Reporting.find();
    res.status(200).json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a report by ID
exports.updateReport = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updatedReport = await Reporting.findByIdAndUpdate(id, updatedData, { new: true });
    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json(updatedReport);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a report by ID
exports.deleteReport = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedReport = await Reporting.findByIdAndDelete(id);
    if (!deletedReport) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
