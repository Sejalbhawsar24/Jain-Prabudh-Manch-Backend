const express = require('express');
const router = express.Router();
const { 
    getStates, 
    getDistricts, 
    getCities, 
    getAreas,
    getCitySanghs,
    getAreaSanghs,
    getSanghByLocation
} = require('../controller/LocationController');
const { authMiddleware } = require('../middlewares/authMiddlewares');

// Get states with active Sanghs
router.get('/states', authMiddleware, getStates);
router.get('/',getSanghByLocation)
// Get districts in state with active Sanghs
router.get('/districts/:state', authMiddleware, getDistricts);

// Get cities in district with active Sanghs
router.get('/cities/:state/:district', authMiddleware, getCities);

// Get areas in city with active Sanghs
router.get('/areas/:state/:district/:city', authMiddleware, getAreas);

// Get all Sanghs in a city
router.get('/sanghs/:state/:district/:city', authMiddleware, getCitySanghs);

// Get all Sanghs in an area
router.get('/sanghs/:state/:district/:city/:area', authMiddleware, getAreaSanghs);

module.exports = router;
