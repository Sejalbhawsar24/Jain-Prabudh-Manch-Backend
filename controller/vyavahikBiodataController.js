const VyavahikBiodata = require('../model/VyavahikBiodata');
// Create API
const createBiodata = async (req, res) => {
  try {
    // Extract image URLs from uploaded files
    const passportPhoto = req.files['passportPhoto'] ? req.files['passportPhoto'][0].location : null;
    const fullPhoto = req.files['fullPhoto'] ? req.files['fullPhoto'][0].location : null;
    const familyPhoto = req.files['familyPhoto'] ? req.files['familyPhoto'][0].location : null;
    const legalDocument = req.files['legalDocument'] ? req.files['legalDocument'][0].location : null;

    // Normalize marriage type
    const marriageType = req.body.remarrigeDetails?.marriageType?.trim().toLowerCase();

    // Divorce case me legal document required
    if (marriageType === 'divorce' && !legalDocument) {
      return res.status(400).json({
        success: false,
        message: 'Legal document is required for divorce cases.',
      });
    }

    // Create biodata with images & legal document
    const biodata = new VyavahikBiodata({
      ...req.body,
      passportPhoto,
      fullPhoto,
      familyPhoto,
      remarrigeDetails: {
        ...req.body.remarrigeDetails,
        divorceDetails: {
          ...req.body.remarrigeDetails?.divorceDetails,
          legalDocument: legalDocument, // Add uploaded legal document
        },
      },
    });
    req.body.userId = req.user._id;

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
    let filter = {};
    // Search Parameters
    const { age, name, gotra, panth, mulJain, upJati, dobPlace } = req.query;
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    if (age) {
      filter.age = age;
    }
    if (gotra) {
      filter.gotra = { $regex: gotra, $options: 'i' };
    }
    if (panth) {
      filter.panth = { $regex: panth, $options: 'i' };
    }
    if (mulJain) {
      filter.mulJain = { $regex: mulJain, $options: 'i' };
    }
    if (upJati) {
      filter.upJati = { $regex: upJati, $options: 'i' };
    }
    if (dobPlace) {
      filter.dobPlace = { $regex: dobPlace, $options: 'i' };
    }
    const biodatas = await VyavahikBiodata.find(filter)
      .populate('userId', 'firstName lastName profilePicture');
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
// Check if user has a biodata
const checkUserBiodata = async (req, res) => {
  try {
    const biodata = await VyavahikBiodata.findOne({ userId: req.user._id });
    
    if (!biodata) {
      return res.status(200).json({
        success: true,
        hasBiodata: false
      });
    }
    
    res.status(200).json({
      success: true,
      hasBiodata: true,
      isPaid: biodata.paymentStatus === 'paid',
      isVisible: biodata.isVisible,
      biodataId: biodata._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking biodata status',
      error: error.message,
    });
  }
};

module.exports = {
  createBiodata,
  updateBiodata,
  getBiodata,
  getAllBiodatas,
  checkUserBiodata
};
