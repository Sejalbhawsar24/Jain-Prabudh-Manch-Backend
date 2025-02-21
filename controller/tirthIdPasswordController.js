const TirthIdPassword = require('../model/TirthIdPassword');

// Create TirthIdPassword
exports.createTirthIdPassword = async (req, res) => {
  const { loginId, password, userId } = req.body;

  if (!loginId || !password || !userId) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Check if loginId already exists
    const existingTirth = await TirthIdPassword.findOne({ loginId });
    if (existingTirth) {
      return res.status(409).json({ message: 'Login ID already exists.' });
    }

    // Create a new TirthIdPassword entry
    const newTirth = await TirthIdPassword.create({
      loginId,
      password,
      userId,
    });

    return res.status(201).json({
      message: 'Tirth ID and Password created successfully.',
      data: newTirth,
    });
  } catch (error) {
    console.error('Error creating TirthIdPassword:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
