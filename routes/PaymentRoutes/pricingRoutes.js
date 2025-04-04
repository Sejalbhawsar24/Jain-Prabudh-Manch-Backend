const express = require('express');
const router = express.Router();
const { getPrices, updatePrice } = require('../../controller/PaymentControllers/pricingController');
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddlewares');

// Admin routes - require admin privileges
router.get('/', authMiddleware, isAdmin, getPrices);
router.put('/', authMiddleware, isAdmin, updatePrice);

module.exports = router;
