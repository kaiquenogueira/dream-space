import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per 60s per user
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export const checkRateLimit = async (identifier: string) => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("Redis credentials not found, skipping rate limit check");
    return { success: true, limit: 10, remaining: 10, reset: 0 };
  }
  
  return await ratelimit.limit(identifier);
};
