const HierarchicalSangh = require('../model/SanghModels/hierarchicalSanghModel');
const asyncHandler = require('express-async-handler');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get states where active Sanghs exist
const getStates = asyncHandler(async (req, res) => {
    try {
        const states = await HierarchicalSangh.distinct('location.state', {
            status: 'active'
        });
        return successResponse(res, states, 'States retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get districts in a state where active Sanghs exist
const getDistricts = asyncHandler(async (req, res) => {
    try {
        const { state } = req.params;
        const districts = await HierarchicalSangh.distinct('location.district', {
            status: 'active',
            'location.state': state,
            'location.district': { $exists: true, $ne: '' }
        });
        return successResponse(res, districts, 'Districts retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get cities in a district where active Sanghs exist
const getCities = asyncHandler(async (req, res) => {
    try {
        const { state, district } = req.params;
        const cities = await HierarchicalSangh.distinct('location.city', {
            status: 'active',
            'location.state': state,
            'location.district': district,
            'location.city': { $exists: true, $ne: '' }
        });
        return successResponse(res, cities, 'Cities retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get areas in a city where active Sanghs exist
const getAreas = asyncHandler(async (req, res) => {
    try {
        const { state, district, city } = req.params;
        const areas = await HierarchicalSangh.distinct('location.area', {
            status: 'active',
            'location.state': state,
            'location.district': district,
            'location.city': city,
            'location.area': { $exists: true, $ne: '' }
        });
        return successResponse(res, areas, 'Areas retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get Sanghs in a city
const getCitySanghs = asyncHandler(async (req, res) => {
    try {
        const { state, district, city } = req.params;
        const sanghs = await HierarchicalSangh.find({
            status: 'active',
            'location.state': state,
            'location.district': district,
            'location.city': city,
            level: 'city'
        }).select('name level location officeBearers.role officeBearers.name');
        
        return successResponse(res, sanghs, 'Sanghs retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get Sanghs in an area
const getAreaSanghs = asyncHandler(async (req, res) => {
    try {
        const { state, district, city, area } = req.params;
        const sanghs = await HierarchicalSangh.find({
            status: 'active',
            'location.state': state,
            'location.district': district,
            'location.city': city,
            'location.area': area,
            level: 'area'
        }).select('name level location officeBearers.role officeBearers.name');
        
        return successResponse(res, sanghs, 'Area Sanghs retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get all states where Sanghs exist
const getAvailableStates = asyncHandler(async (req, res) => {
    try {
        const states = await HierarchicalSangh.distinct('location.state', {
            status: 'active'
        });
        
        return successResponse(res, states, 'Available states retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get available districts in a state where Sanghs exist
const getAvailableDistricts = asyncHandler(async (req, res) => {
    try {
        const { state } = req.params;
        
        const districts = await HierarchicalSangh.distinct('location.district', {
            'location.state': state,
            status: 'active'
        });
        
        return successResponse(res, districts, 'Available districts retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get available cities in a district where Sanghs exist
const getAvailableCities = asyncHandler(async (req, res) => {
    try {
        const { state, district } = req.params;
        
        const cities = await HierarchicalSangh.distinct('location.city', {
            'location.state': state,
            'location.district': district,
            status: 'active'
        });
        
        return successResponse(res, cities, 'Available cities retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get available areas in a city where Sanghs exist
const getAvailableAreas = asyncHandler(async (req, res) => {
    try {
        const { state, district, city } = req.params;
        
        const areas = await HierarchicalSangh.distinct('location.area', {
            'location.state': state,
            'location.district': district,
            'location.city': city,
            status: 'active'
        });
        
        return successResponse(res, areas, 'Available areas retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

// Get Sangh details for a specific location
const getSanghByLocation = asyncHandler(async (req, res) => {
    try {
        const { state, district, city, area } = req.query;
        
        const query = { status: 'active' };
        console.log('Query:', query);
        if (area) {
            query['location.area'] = area;
            query['location.city'] = city;
            query['location.district'] = district;
            query['location.state'] = state;
            query.level = 'area';
        } else if (city) {
            query['location.city'] = city;
            query['location.district'] = district;
            query['location.state'] = state;
            query.level = 'city';
        } else if (district) {
            query['location.district'] = district;
            query['location.state'] = state;
            query.level = 'district';
        } else if (state) {
            query['location.state'] = state;
            query.level = 'state';
        } else {
            query.level = 'country';
        }
        
        const sangh = await HierarchicalSangh.findOne(query)
            .select('name level location officeBearers')
            .populate('officeBearers.userId', 'firstName lastName fullName');
            
        if (!sangh) {
            return errorResponse(res, 'No Sangh found for this location', 404);
        }
        
        return successResponse(res, sangh, 'Sangh details retrieved successfully');
    } catch (error) {
        return errorResponse(res, error.message, 500);
    }
});

module.exports = {
    getStates,
    getDistricts,
    getCities,
    getAreas,
    getCitySanghs,
    getAreaSanghs,
    getAvailableStates,
    getAvailableDistricts,
    getAvailableCities,
    getAvailableAreas,
    getSanghByLocation
};
