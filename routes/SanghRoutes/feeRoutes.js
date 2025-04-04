const express = require('express');
const router = express.Router();
const {
    getFeePolicy,
    updateFeePolicy,
    recordFeePayment,
    generateReminders,
    getFeeStatus,
    getMemberPaymentHistory,
    sendReminders,
    calculatePendingFees,
    updateDistributionStatus,
    getDistributionDetails,
    getPendingDistributions,
    getDistributionHistory
} = require('../../controller/SanghControllers/feeController');
const { authenticate } = require('../../middlewares/authMiddlewares');
const { isPresident, isOfficeBearer } = require('../../middlewares/sanghPermissions');
const upload = require('../../middlewares/upload');

// Fee policy routes
router.get('/:sanghId/policy', authenticate, isOfficeBearer, getFeePolicy);
router.put('/:sanghId/policy', authenticate, isPresident, updateFeePolicy);

// Fee payment routes
router.post('/:sanghId/payments', authenticate, isOfficeBearer, upload.single('receipt'), recordFeePayment);
router.get('/:sanghId/payments/status', authenticate, isOfficeBearer, getFeeStatus);
router.get('/:sanghId/payments/:userId', authenticate, isOfficeBearer, getMemberPaymentHistory);
router.get('/:sanghId/payments/:userId/pending', authenticate, isOfficeBearer, calculatePendingFees);

// Reminder routes
router.post('/:sanghId/reminders/generate', authenticate, isOfficeBearer, generateReminders);
router.post('/:sanghId/reminders/send', authenticate, isOfficeBearer, sendReminders);

// Distribution management routes
router.put('/:sanghId/payments/:paymentId/distribution/:level', authenticate, isPresident, updateDistributionStatus);
router.get('/:sanghId/distributions', authenticate, isOfficeBearer, getDistributionDetails);
router.get('/:sanghId/distributions/pending', authenticate, isOfficeBearer, getPendingDistributions);
router.get('/:sanghId/distributions/history', authenticate, isOfficeBearer, getDistributionHistory);

module.exports = router; 