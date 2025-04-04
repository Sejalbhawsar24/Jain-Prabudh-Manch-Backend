const express = require('express');
const router = express.Router();
const { isAdmin, authMiddleware } = require('../../middlewares/authMiddlewares');
const { getAllPayments } = require('../../controller/PaymentControllers/paymentController');

// Admin route to fetch all payments
router.get('/', authMiddleware, isAdmin, getAllPayments);

module.exports = router;