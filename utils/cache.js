// utils/cache.js
const redis = require('../config/redisClient');

const getOrSetCache = async (key, fetchFn, ttl = 300) => {
  try {
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      // Check if the data is already an object or needs parsing
      if (typeof cachedData === 'string') {
        try {
          return JSON.parse(cachedData);
        } catch (parseError) {
          console.error('Parse error:', parseError);
          return cachedData; // Return as is if parsing fails
        }
      }
      return cachedData; // It's already an object, return as is
    }

    const freshData = await fetchFn();
    
    // Store data in Redis
    // Make sure we're storing a string if it's an object
    const dataToStore = typeof freshData === 'object' ? 
      JSON.stringify(freshData) : freshData;
      
    await redis.set(key, dataToStore, 'EX', ttl);
    return freshData;
  } catch (error) {
    console.error('Cache error:', error);
    return await fetchFn(); // Fallback to direct fetch
  }
};

const invalidateCache = async (key) => {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

const invalidatePattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)));
    }
  } catch (error) {
    console.error('Pattern invalidation error:', error);
  }
};

const invalidatePostCaches = async (userId) => {
  await invalidatePattern(`userPosts:${userId}:*`);
  await invalidatePattern('combinedFeed:*');
  await invalidateCache('combinedFeed:firstPage:limit:10');
};

module.exports = { 
  getOrSetCache, 
  invalidateCache,
  invalidatePattern,
  invalidatePostCaches 
};