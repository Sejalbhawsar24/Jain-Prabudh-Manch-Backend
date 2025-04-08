// utils/cache.js
const redis = require('../config/redisClient');

const getOrSetCache = async (key, fetchFn, ttl = 300) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const freshData = await fetchFn();
    await redis.set(key, JSON.stringify(freshData), 'EX', ttl);
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
    if (keys.length > 0) {
      await redis.del(keys);
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