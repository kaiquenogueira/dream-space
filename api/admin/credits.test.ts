
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import creditsHandler from './credits';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// Mock supabaseAdmin
vi.mock('../lib/supabaseAdmin', () => {
  return {
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    },
  };
});

describe('Admin Credits Handler', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body: {
        targetUserId: 'target-user-id',
        creditsToAdd: 100,
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('should return 405 if method is not POST', async () => {
    req.method = 'GET';
    await creditsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('should return 401 if no authorization header', async () => {
    req.headers.authorization = undefined;
    await creditsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Missing or invalid token' });
  });

  it('should return 401 if token is invalid', async () => {
    // Mock getUser failure
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    await creditsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 403 if user is not admin', async () => {
    // Mock getUser success
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'admin-id' } },
      error: null,
    });

    // Mock profile check (not admin)
    const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
                data: { is_admin: false },
                error: null,
            }),
        }),
    });
    (supabaseAdmin!.from as any).mockReturnValue({ select: selectMock });

    await creditsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Admin access required' });
  });

  it('should return 400 if targetUserId or creditsToAdd is missing', async () => {
    // Mock getUser success
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'admin-id' } },
      error: null,
    });

    // Mock profile check (is admin)
    const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
                data: { is_admin: true },
                error: null,
            }),
        }),
    });
    (supabaseAdmin!.from as any).mockReturnValue({ select: selectMock });

    req.body.targetUserId = undefined;
    await creditsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should successfully update credits', async () => {
    // Mock getUser success
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'admin-id' } },
      error: null,
    });

    // Mock profile check (is admin) and target user fetch
    const singleMock = vi.fn()
        .mockResolvedValueOnce({ // Admin check
            data: { is_admin: true },
            error: null,
        })
        .mockResolvedValueOnce({ // Target user fetch
            data: { credits_remaining: 50, email: 'target@example.com' },
            error: null,
        });

    const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
            single: singleMock,
        }),
    });

    const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabaseAdmin!.from as any).mockReturnValue({
        select: selectMock,
        update: updateMock,
    });

    await creditsHandler(req, res);

    expect(updateMock).toHaveBeenCalled();
    // Check if update was called with correct new credits (50 + 100 = 150)
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ credits_remaining: 150 }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
