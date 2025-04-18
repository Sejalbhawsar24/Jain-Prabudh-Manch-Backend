const Inquiry = require('../../model/SanghModels/inquirySchema');

exports.createInquiry = async (req, res) => {
  try {
    const { unionType, phoneNumber } = req.body;

    if (!unionType || !phoneNumber) {
      return res.status(400).json({ message: 'कृपया सभी जानकारी भरें।' });
    }

    const inquiry = new Inquiry({ unionType, phoneNumber });
    await inquiry.save();

    res.status(201).json({ message: 'Inquiry सफलतापूर्वक दर्ज की गई।', inquiry });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ message: 'कुछ गलती हुई। कृपया फिर कोशिश करें।' });
  }
};
