const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../model/PaymentModels/paymentModel');

// Initialize Razorpay with API keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create a Razorpay order
 * @param {Object} options - Order options
 * @param {number} options.amount - Amount in paise (INR)
 * @param {string} options.receipt - Receipt ID
 * @param {Object} options.notes - Additional notes
 * @returns {Promise<Object>} - Razorpay order object
 */
const createOrder = async (options) => {
    try {
        console.log("Creating Razorpay Order with options:", options);
        const order = await razorpay.orders.create({
            amount: options.amount,
            currency: options.currency || 'INR',
            receipt: options.receipt,
            notes: options.notes || {}
        });
        console.log("Creating Razorpay:", order);

        return order;
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw new Error(`Failed to create payment order: ${error.message}`);
    }
};

/**
 * Verify Razorpay payment signature
 * @param {Object} options - Verification options
 * @param {string} options.orderId - Razorpay order ID
 * @param {string} options.paymentId - Razorpay payment ID
 * @param {string} options.signature - Razorpay signature
 * @returns {boolean} - Whether signature is valid
 */
const verifyPaymentSignature = (options) => {
    try {
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${options.orderId}|${options.paymentId}`)
            .digest('hex');
        
        return generatedSignature === options.signature;
    } catch (error) {
        console.error('Error verifying payment signature:', error);
        return false;
    }
};

/**
 * Update payment status in database
 * @param {Object} options - Update options
 * @param {string} options.orderId - Razorpay order ID
 * @param {string} options.paymentId - Razorpay payment ID
 * @param {string} options.status - New payment status
 * @returns {Promise<Object>} - Updated payment document
 */
const updatePaymentStatus = async (options) => {
    try {
        const updateData = {
            status: options.status,
            updatedAt: new Date()
        };
        
        if (options.paymentId) {
            updateData.paymentId = options.paymentId;
        }
        
        if (options.entityId) {
            updateData.entityId = options.entityId;
        }
        
        const payment = await Payment.findOneAndUpdate(
            { orderId: options.orderId },
            updateData,
            { new: true }
        );
        
        return payment;
    } catch (error) {
        console.error('Error updating payment status:', error);
        throw new Error(`Failed to update payment status: ${error.message}`);
    }
};

/**
 * Get payment details by order ID
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} - Payment document
 */
const getPaymentByOrderId = async (orderId) => {
    try {
        const payment = await Payment.findOne({ orderId });
        return payment;
    } catch (error) {
        console.error('Error fetching payment:', error);
        throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
};

module.exports = {
    createOrder,
    verifyPaymentSignature,
    updatePaymentStatus,
    getPaymentByOrderId
};
