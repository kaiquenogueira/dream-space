import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { supabaseAdmin } from '../../api/_lib/supabaseAdmin.js'; // Use .js if that's how it's imported in source

// Mock env vars immediately
process.env.STRIPE_SECRET_KEY = 'test_key';
process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_key';

// Mock Stripe
vi.mock('stripe', () => {
  const stripeInstance = {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'http://stripe.url' }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user123', plan: 'starter' },
            subscription: 'sub_123',
          },
        },
      }),
    },
    customers: {
      list: vi.fn().mockResolvedValue({ data: [{ id: 'cus_123' }] }),
      retrieve: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'http://portal.url' }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        metadata: { userId: 'user123', plan: 'pro' },
        current_period_end: 1740000000
      }),
    }
  };
  return {
    default: vi.fn(function () { return stripeInstance; }),
  };
});

// Mock Supabase Admin
vi.mock('../lib/supabaseAdmin.js', () => {
  const mockBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'user123' }, error: null }),
  };
  return {
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue(mockBuilder),
    },
  };
});

// Helper to mock request/response
const createMockReqRes = (method = 'POST', body: any = {}, headers: any = {}) => {
  const req: any = {
    method,
    body,
    headers: { ...headers, origin: 'http://localhost:3000' },
    on: vi.fn((event, cb) => {
      if (event === 'data') {
        // Simulate raw body stream
        cb(Buffer.from(JSON.stringify(body)));
      }
      if (event === 'end') cb();
      return req;
    }),
  };
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
  return { req, res };
};

describe('Stripe Integration', () => {
  let checkoutHandler: any;
  let webhookHandler: any;
  let portalHandler: any;

  beforeAll(async () => {
    // Dynamic import to ensure env vars are set
    checkoutHandler = (await import('./checkout.js')).default;
    webhookHandler = (await import('./webhook.js')).default;
    portalHandler = (await import('./portal.js')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Checkout', () => {
    it('should create a checkout session', async () => {
      const { req, res } = createMockReqRes('POST', { plan: 'starter' }, { authorization: 'Bearer token' });

      (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      await checkoutHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ url: 'http://stripe.url' });
    });

    it('should return 401 if unauthorized', async () => {
      const { req, res } = createMockReqRes('POST', { plan: 'starter' }); // No auth header
      await checkoutHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if plan is invalid', async () => {
      const { req, res } = createMockReqRes('POST', { plan: 'invalid_plan' }, { authorization: 'Bearer token' });
      (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });
      await checkoutHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 405 if method is not POST', async () => {
      const { req, res } = createMockReqRes('GET', { plan: 'starter' });
      await checkoutHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
    });
  });

  describe('Portal', () => {
    it('should return 405 if method is not POST', async () => {
      const { req, res } = createMockReqRes('GET', {});
      await portalHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('should create a portal session', async () => {
      const { req, res } = createMockReqRes('POST', {}, { authorization: 'Bearer token' });

      (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      await portalHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ url: 'http://portal.url' });
    });

    it('should return 404 if no customer found', async () => {
      const { req, res } = createMockReqRes('POST', {}, { authorization: 'Bearer token' });

      (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      });

      // Mock empty customers list
      const stripeMock = (await import('stripe')).default as any;
      stripeMock().customers.list.mockResolvedValueOnce({ data: [] });

      await portalHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Webhook', () => {
    it('should return 405 if method is not POST', async () => {
      const { req, res } = createMockReqRes('GET', {});
      await webhookHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('should return 400 if signature is missing', async () => {
      const { req, res } = createMockReqRes('POST', {}); // No signature
      await webhookHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle checkout.session.completed', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      // Mock event type
      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user123', plan: 'starter' },
            subscription: 'sub_123'
          },
        },
      });

      stripeMock().subscriptions.retrieve.mockResolvedValueOnce({
        metadata: { userId: 'user123', plan: 'starter' },
        current_period_end: 1740000000
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(supabaseAdmin!.from('profiles').update).toHaveBeenCalledWith(expect.objectContaining({
        plan: 'starter',
        credits_remaining: 100,
        credits_reset_at: new Date(1740000000 * 1000).toISOString()
      }));
    });

    it('should handle invoice.paid (renewal)', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockReturnValueOnce({
        type: 'invoice.paid',
        data: {
          object: {
            subscription: 'sub_123',
          },
        },
      });

      // Mock subscription retrieve
      stripeMock().subscriptions.retrieve.mockResolvedValueOnce({
        metadata: { userId: 'user123', plan: 'pro' },
        current_period_end: 1740000000
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(supabaseAdmin!.from('profiles').update).toHaveBeenCalledWith(expect.objectContaining({
        credits_remaining: 400,
        credits_reset_at: new Date(1740000000 * 1000).toISOString()
      }));
    });

    it('should handle customer.subscription.deleted', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockReturnValueOnce({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { userId: 'user123' },
          },
        },
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(supabaseAdmin!.from('profiles').update).toHaveBeenCalledWith(expect.objectContaining({
        plan: 'free',
        credits_remaining: 15
      }));
    });

    it('should handle customer.subscription.updated', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockReturnValueOnce({
        type: 'customer.subscription.updated',
        data: {
          object: {
            metadata: { userId: 'user123', plan: 'starter' },
            status: 'active',
            current_period_end: 1750000000
          },
        },
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(supabaseAdmin!.from('profiles').update).toHaveBeenCalledWith(expect.objectContaining({
        plan: 'starter',
        credits_remaining: 100,
        credits_reset_at: new Date(1750000000 * 1000).toISOString()
      }));
    });

    it('should return 400 on signature error', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should warn if metadata is missing in checkout.session.completed', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {}, // Missing userId/plan
          },
        },
      });

      const consoleSpy = vi.spyOn(console, 'warn');
      await webhookHandler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith('Missing userId or plan in session metadata');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle invoice.paid (fallback)', async () => {
      const { req, res } = createMockReqRes('POST', {}, { 'stripe-signature': 'sig' });

      const stripeMock = (await import('stripe')).default as any;
      stripeMock().webhooks.constructEvent.mockReturnValueOnce({
        type: 'invoice.paid',
        data: {
          object: {
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      });

      // Mock subscription retrieve WITHOUT metadata
      stripeMock().subscriptions.retrieve.mockResolvedValueOnce({
        metadata: {}
      });

      // Mock customer retrieve
      stripeMock().customers.retrieve.mockResolvedValueOnce({
        email: 'test@example.com'
      });

      // Mock user lookup
      (supabaseAdmin!.from('profiles').select as any).mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'user123', plan: 'pro' }, error: null })
        })
      });

      const consoleSpy = vi.spyOn(console, 'warn');
      await webhookHandler(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Metadata missing on subscription'));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

