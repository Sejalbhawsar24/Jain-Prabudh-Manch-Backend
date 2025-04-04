/**
 * Standard pagination utility
 * @param {Object} req - Express request object
 * @param {Object} query - Mongoose query object
 * @param {Object} options - Additional options
 * @returns {Object} Paginated results
 */
exports.paginateResults = async (req, query, options = {}) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const countQuery = { ...query };
    const totalItems = await options.model.countDocuments(countQuery);
    
    const results = await options.model.find(query)
      .sort(options.sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(options.populate || []);
    
    return {
      results,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page < Math.ceil(totalItems / limit),
        hasPrevPage: page > 1
      }
    };
  }; 