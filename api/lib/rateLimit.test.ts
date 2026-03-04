
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, ratelimit } from './rateLimit';

// Mock Upstash Redis and Ratelimit
vi.mock('@upstash/redis', () => {
  return {
    Redis: class Redis {
      constructor() {}
    },
  };
});

vi.mock('@upstash/ratelimit', () => {
  return {
    Ratelimit: class Ratelimit {
      static slidingWindow() {
        return {};
      }
      constructor() {}
      limit = vi.fn();
    },
  };
});

describe('Rate Limit', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should skip rate limit check if env vars are missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkRateLimit('test-id');

    expect(result).toEqual({ success: true, limit: 10, remaining: 10, reset: 0 });
  });

  it('should call ratelimit.limit if env vars are present', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-url.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

    const mockLimit = vi.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 1000,
    });
    
    // We need to re-import or mock the instance method since we mocked the class
    ratelimit.limit = mockLimit;

    const result = await checkRateLimit('test-id');

    expect(mockLimit).toHaveBeenCalledWith('test-id');
    expect(result).toEqual({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 1000,
    });
  });

  it('should return failure when rate limit is exceeded', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-url.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

    const mockLimit = vi.fn().mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 1000,
    });
    
    ratelimit.limit = mockLimit;

    const result = await checkRateLimit('test-id');

    expect(mockLimit).toHaveBeenCalledWith('test-id');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
