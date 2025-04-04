const express = require('express');
const { createBiodata, updateBiodata, getBiodata, getAllBiodatas, checkUserBiodata } = require('../controller/vyavahikBiodataController');
const upload = require('../middlewares/upload');
const { 
    createBiodataPaymentOrder,
    verifyBiodataPayment,
    completeBiodataRegistration
  } = require('../controller/PaymentControllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddlewares');
const router = express.Router();

router.use(authMiddleware);
// Check if user has a biodata
router.get('/check-status', checkUserBiodata);
// New payment flow routes
router.post('/', upload.biodataImageUpload, createBiodata);
router.post('/create-payment', createBiodataPaymentOrder);
router.post('/verify-payment', verifyBiodataPayment);
router.post('/complete-registration/:orderId', upload.biodataImageUpload, completeBiodataRegistration);


// Update a biodata by ID
router.put('/:id', updateBiodata);

// Get a single biodata by ID
router.get('/:id', getBiodata);

// Get all biodatas
router.get('/', getAllBiodatas);

module.exports = router;
