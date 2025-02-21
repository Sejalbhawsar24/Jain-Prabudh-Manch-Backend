const Sadhu = require('../model/sadhuIdPassModel');

// Create Sadhu ID and Password
const createSadhu = async (req, res) => {
  try {
    const { loginId, password, userId } = req.body;
    if (!loginId || !password || !userId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const newSadhu = new Sadhu({
      loginId,
      password,
      userId,
    });
    await newSadhu.save();
    res.status(201).json({
      message: 'Sadhu ID and Password created successfully!',
      sadhu: newSadhu,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createSadhu,
};
