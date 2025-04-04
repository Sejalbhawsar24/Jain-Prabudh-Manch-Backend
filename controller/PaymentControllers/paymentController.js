const Payment = require('../../model/PaymentModels/paymentModel');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const razorpayService = require('../../services/razorpayService');
const JainVyapar = require('../../model/VyaparModels/vyaparModel');
const VyavahikBiodata = require('../../model/VyavahikBiodata');
const User = require('../../model/UserRegistrationModels/userModel');

// Constants for payment amounts
const PAYMENT_AMOUNTS = {
    vyapar: 500 * 100, // ₹999 in paise
    biodata: 499 * 100, // ₹499 in paise
    sangh: 1999 * 100,
    panch: 499 * 100,
    tirth: 1499 * 100,
    sadhu: 0 // Free for sadhus
};

/**
 * Create a payment order for Vyapar registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createVyaparPaymentOrder = async (req, res) => {
    try {
        // Store form data in session
        const formData = req.body;
        
        // Validate required fields
        if (!formData.businessName || !formData.businessType || !formData.productCategory) {
            return errorResponse(res, 'Missing required business details', 400);
        }
        
        // Create a shorter receipt ID (max 40 chars)
        // Using timestamp + random number instead of full UUID
        const timestamp = Date.now().toString();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const receipt = `vyp_${timestamp}_${randomNum}`;
        
        // Create Razorpay order
        const order = await razorpayService.createOrder({
            amount: PAYMENT_AMOUNTS.vyapar,
            receipt,
            notes: {
                entityType: 'vyapar',
                userId: req.user._id.toString(),
                businessName: formData.businessName
            }
        });
        console.log("🔹 Razorpay Order Created:", order);
        // Save payment record to database
        const payment = new Payment({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            entityType: 'vyapar',
            userId: req.user._id,
            formData,
            receipt
        });
        console.log("✅ Payment Saved in DB:", payment);

        await payment.save();
        
        // Return order details to client
        return successResponse(res, {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating payment order:', error);
        return errorResponse(res, error.message, 500);
    }
};

/**
 * Create a payment order for Biodata registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createBiodataPaymentOrder = async (req, res) => {
    try {
        // Store form data in session
        const formData = req.body;
        
        // Validate required fields
        if (!formData.name || !formData.gender) {
            return errorResponse(res, 'Missing required biodata details', 400);
        }
        
        // Create a shorter receipt ID (max 40 chars)
        const timestamp = Date.now().toString();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const receipt = `bio_${timestamp}_${randomNum}`;
        
        // Create Razorpay order
        const order = await razorpayService.createOrder({
            amount: PAYMENT_AMOUNTS.biodata,
            receipt,
            notes: {
                entityType: 'biodata',
                userId: req.user._id.toString(),
                name: formData.name
            }
        });
        
        // Save payment record to database
        const payment = new Payment({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            entityType: 'biodata',
            userId: req.user._id,
            formData,
            receipt
        });
        
        await payment.save();
        
        // Return order details to client
        return successResponse(res, {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating biodata payment order:', error);
        return errorResponse(res, error.message, 500);
    }
};

/**
 * Verify payment and complete Vyapar registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyVyaparPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        // Verify payment signature
        const isValidSignature = razorpayService.verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        });
        
        if (!isValidSignature) {
            return errorResponse(res, 'Invalid payment signature', 400);
        }
        
        // Get payment details from database
        const payment = await razorpayService.getPaymentByOrderId(razorpay_order_id);
        
        if (!payment) {
            return errorResponse(res, 'Payment record not found', 404);
        }
        
        // Update payment status to paid
        await razorpayService.updatePaymentStatus({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            status: 'paid'
        });
        
        // Return success response with payment ID
        return successResponse(res, {
            message: 'Payment verified successfully',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        return errorResponse(res, error.message, 500);
    }
};

/**
 * Verify payment for Biodata registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyBiodataPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        // Verify payment signature
        const isValidSignature = razorpayService.verifyPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature
        });
        
        if (!isValidSignature) {
            return errorResponse(res, 'Invalid payment signature', 400);
        }
        
        // Get payment details from database
        const payment = await razorpayService.getPaymentByOrderId(razorpay_order_id);
        
        if (!payment) {
            return errorResponse(res, 'Payment record not found', 404);
        }
        
        // Update payment status to paid
        await razorpayService.updatePaymentStatus({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            status: 'paid'
        });
        
        // Return success response with payment ID
        return successResponse(res, {
            message: 'Payment verified successfully',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
        });
    } catch (error) {
        console.error('Error verifying biodata payment:', error);
        return errorResponse(res, error.message, 500);
    }
};

/**
 * Complete Vyapar registration after successful payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const completeVyaparRegistration = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Get payment details from database
        const payment = await razorpayService.getPaymentByOrderId(orderId);
        
        if (!payment) {
            return errorResponse(res, 'Payment record not found', 404);
        }
        
        if (payment.status !== 'paid') {
            return errorResponse(res, 'Payment not completed', 400);
        }
        
        // Extract form data from payment record
        const formData = payment.formData;
        
        // Handle uploaded photos and documents
        const photos = [];
        const documents = [];

        if (req.files) {
            if (req.files.entityPhoto) {
                photos.push(...req.files.entityPhoto.map(file => ({
                    url: file.location,
                    type: file.mimetype.startsWith('image/') ? 'image' : 'other'
                })));
            }

            if (req.files.entityDocuments) {
                documents.push(...req.files.entityDocuments.map(file => ({
                    url: file.location,
                    type: file.mimetype === 'application/pdf' ? 'pdf' : 'other'
                })));
            }
        }
        
        // Create Vyapar business
        const vyapar = new JainVyapar({
            businessName: formData.businessName,
            businessType: formData.businessType,
            productCategory: formData.productCategory,
            description: formData.description,
            location: formData.location,
            citySanghId: formData.citySanghId,
            owner: {
                ...formData.owner,
                userId: req.user._id
            },
            businessDetails: formData.businessDetails,
            photos,
            documents,
            applicationStatus: 'approved',
            status: 'active',
            reviewNotes: {
                text: 'Auto-approved after payment',
                reviewedAt: new Date()
            }
        });
        
        await vyapar.save();
        
        // Update payment record with entity ID
        await razorpayService.updatePaymentStatus({
            orderId,
            status: 'paid',
            entityId: vyapar._id
        });
        
        // Add vyaparRole to user
        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                vyaparRoles: {
                    vyaparId: vyapar._id,
                    role: 'owner'
                }
            }
        });
        
        return successResponse(res, {
            message: 'Business created successfully after payment verification',
            vyaparId: vyapar._id
        });
    } catch (error) {
        console.error('Error completing registration:', error);
        return errorResponse(res, error.message, 500);
    }
};

/**
 * Complete Biodata registration after successful payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const completeBiodataRegistration = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Get payment details from database
        const payment = await razorpayService.getPaymentByOrderId(orderId);
        
        if (!payment) {
            return errorResponse(res, 'Payment record not found', 404);
        }
        
        if (payment.status !== 'paid') {
            return errorResponse(res, 'Payment not completed', 400);
        }
        
        // Extract form data from payment record
        const formData = payment.formData;
        
        // Handle uploaded photos
        let passportPhoto = null;
        let fullPhoto = null;
        let familyPhoto = null;
        let legalDocument = null;

        if (req.files) {
            passportPhoto = req.files['passportPhoto'] ? req.files['passportPhoto'][0].location : null;
            fullPhoto = req.files['fullPhoto'] ? req.files['fullPhoto'][0].location : null;
            familyPhoto = req.files['familyPhoto'] ? req.files['familyPhoto'][0].location : null;
            legalDocument = req.files['legalDocument'] ? req.files['legalDocument'][0].location : null;
        }
        
        // Create biodata with payment information
        const biodata = new VyavahikBiodata({
            ...formData,
            userId: req.user._id,
            paymentStatus: 'paid',
            paymentId: payment.paymentId,
            isVisible: true,
            passportPhoto,
            fullPhoto,
            familyPhoto,
            remarrigeDetails: {
                ...formData.remarrigeDetails,
                divorceDetails: {
                    ...formData.remarrigeDetails?.divorceDetails,
                    legalDocument
                }
            }
        });
        
        await biodata.save();
        
        // Update payment record with entity ID
        await razorpayService.updatePaymentStatus({
            orderId,
            status: 'paid',
            entityId: biodata._id
        });
        
        return successResponse(res, {
            message: 'Biodata created successfully after payment verification',
            biodataId: biodata._id
        });
    } catch (error) {
        console.error('Error completing biodata registration:', error);
        return errorResponse(res, error.message, 500);
    }
};
const getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, entityType, userId } = req.query;

        // Build query filters
        const filters = {};
        if (status) filters.status = status; // Filter by payment status
        if (entityType) filters.entityType = entityType; // Filter by entity type (e.g., vyapar, biodata)
        if (userId) filters.userId = userId; // Filter by user ID

        // Fetch payments with pagination
        const payments = await Payment.find(filters)
            .sort({ createdAt: -1 }) // Sort by most recent
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalPayments = await Payment.countDocuments(filters);

        return successResponse(res, 'Payments retrieved successfully', {
            payments,
            pagination: {
                total: totalPayments,
                page: parseInt(page),
                pages: Math.ceil(totalPayments / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return errorResponse(res, error.message, 500);
    }
};

module.exports = {
    getAllPayments,
};

module.exports = {
    createVyaparPaymentOrder,
    verifyVyaparPayment,
    completeVyaparRegistration,
    createBiodataPaymentOrder,
    verifyBiodataPayment,
    completeBiodataRegistration
};
