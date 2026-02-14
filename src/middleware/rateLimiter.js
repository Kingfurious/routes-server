/**
 * Rate Limiter Middleware
 * 
 * Implements token bucket rate limiting to prevent abuse.
 * Default: 5 calls per minute per user
 * 
 * Usage:
 * const { rateLimitCalls } = require('./rateLimiter');
 * router.post('/startCall', rateLimitCalls(5, 60), controller);
 */

// Store for rate limit tracking: { userId: { tokens, lastRefill } }
const buckets = new Map();

/**
 * Rate limiter middleware using token bucket algorithm
 * @param {number} maxTokens - Maximum tokens allowed in the bucket
 * @param {number} refillIntervalSeconds - Time interval to refill tokens
 * @returns {Function} Express middleware
 */
const createRateLimiter = (maxTokens = 5, refillIntervalSeconds = 60) => {
  return (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.uid) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      const userId = req.user.uid;
      const now = Date.now();

      // Initialize or get bucket
      if (!buckets.has(userId)) {
        buckets.set(userId, {
          tokens: maxTokens,
          lastRefill: now,
        });
      }

      let bucket = buckets.get(userId);
      const timeSinceLastRefill = (now - bucket.lastRefill) / 1000; // Convert to seconds
      const refillAmount = (timeSinceLastRefill / refillIntervalSeconds) * maxTokens;

      // Refill tokens (cap at maxTokens)
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refillAmount);
      bucket.lastRefill = now;

      // Check if user has tokens
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return next();
      }

      // Rate limit exceeded
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Max ${maxTokens} calls per ${refillIntervalSeconds} seconds.`,
        retryAfter: Math.ceil(refillIntervalSeconds / maxTokens),
      });
    } catch (error) {
      console.error("Rate limiter error:", error);
      return next(); // Allow request to proceed on error
    }
  };
};

// Pre-configured rate limiters
const rateLimitCalls = createRateLimiter(5, 60); // 5 calls per minute

/**
 * Clean up old buckets periodically to prevent memory leaks
 * Run this every 5 minutes
 */
const cleanupOldBuckets = () => {
  const now = Date.now();
  const maxBucketAge = 5 * 60 * 1000; // 5 minutes

  for (const [userId, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxBucketAge) {
      buckets.delete(userId);
    }
  }
};

// Start cleanup interval
setInterval(cleanupOldBuckets, 5 * 60 * 1000);

module.exports = {
  createRateLimiter,
  rateLimitCalls,
};
