const JainGranth = require("../model/JainGranthModel");

exports.uploadGranth = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required!" });
      }
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required!" });
      }
      const fileUrl = `uploads/${req.file.filename}`;
      const newGranth = new JainGranth({ title, fileUrl });
      await newGranth.save();
      res.status(201).json({ message: "Granth uploaded successfully!", granth: newGranth });
    } catch (error) {
      res.status(500).json({ error: "Server error", details: error.message });
    }
  };

exports.getAllGranths = async (req, res) => {
  try {
    const granths = await JainGranth.find().sort({ createdAt: -1 });
    res.status(200).json(granths);
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
