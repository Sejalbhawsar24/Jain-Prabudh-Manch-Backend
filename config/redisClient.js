// For Upstash REST API, we need to use their SDK instead of ioredis
const { Redis } = require('@upstash/redis');

// Create Redis client using Upstash REST API
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

console.log('✅ Upstash Redis REST API configured');

// Export a promise-based interface consistent with your existing code
module.exports = {
  get: async (key) => {
    try {
      const result = await redis.get(key);
      // Return the raw result without further processing
      return result;
    } catch (err) {
      console.error('❌ Upstash Redis error on get:', err);
      throw err;
    }
  },
  set: async (key, value, exFlag, ttl) => {
    try {
      if (exFlag === 'EX') {
        return await redis.set(key, value, { ex: ttl });
      }
      return await redis.set(key, value);
    } catch (err) {
      console.error('❌ Upstash Redis error on set:', err);
      throw err;
    }
  },
  del: async (key) => {
    try {
      return await redis.del(key);
    } catch (err) {
      console.error('❌ Upstash Redis error on del:', err);
      throw err;
    }
  },
  keys: async (pattern) => {
    try {
      return await redis.keys(pattern);
    } catch (err) {
      console.error('❌ Upstash Redis error on keys:', err);
      throw err;
    }
  }
};