
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import checkOperationHandler from '../../api/check-operation';
import { supabaseAdmin } from '../../api/_lib/supabaseAdmin';

// Mock Supabase
vi.mock('./lib/supabaseAdmin', () => {
  return {
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(),
                })),
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    },
  };
});

// Mock GoogleGenAI
const mockOperationsGet = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class GoogleGenAI {
      constructor() {}
      operations = {
        get: mockOperationsGet,
      };
    },
    GenerateVideosOperation: class GenerateVideosOperation {
        name: string = '';
    }
  };
});

describe('Check Operation Handler', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'mock-api-key';
    req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
      query: {
        operationName: 'operations/123',
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('should return 405 if method is not GET', async () => {
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    });
    req.method = 'POST';
    await checkOperationHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('should return 401 if unauthorized', async () => {
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });
    await checkOperationHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 400 if operationName is missing', async () => {
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    });
    req.query.operationName = undefined;
    await checkOperationHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 403 if user does not own the operation', async () => {
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    });

    const singleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    // Mock chain
    const chainMock = { single: singleMock };
    const limitMock = { limit: vi.fn().mockReturnValue(chainMock) };
    const eqMock3 = { eq: vi.fn().mockReturnValue(limitMock) };
    const eqMock2 = { eq: vi.fn().mockReturnValue(eqMock3) };
    const eqMock1 = { eq: vi.fn().mockReturnValue(eqMock2) };
    const selectMock = { select: vi.fn().mockReturnValue(eqMock1) };

    (supabaseAdmin!.from as any).mockReturnValue(selectMock);

    await checkOperationHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 200 with video url when operation is done', async () => {
    (supabaseAdmin!.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-id' } },
      error: null,
    });

    // Mock ownership check success
    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'generation-id' },
      error: null,
    });

    // Mock chain
    const chainMock = { single: singleMock };
    const limitMock = { limit: vi.fn().mockReturnValue(chainMock) };
    const eqMock3 = { eq: vi.fn().mockReturnValue(limitMock) };
    const eqMock2 = { eq: vi.fn().mockReturnValue(eqMock3) };
    const eqMock1 = { eq: vi.fn().mockReturnValue(eqMock2) };
    
    // Mock update
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = { eq: updateEqMock };

    (supabaseAdmin!.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(eqMock1),
        update: vi.fn().mockReturnValue(updateMock)
    });

    // Mock Google GenAI operation result
    const mockOperationResult = {
        done: true,
        response: {
            generatedVideos: [
                { video: { uri: 'gs://video.mp4' } }
            ]
        }
    };
    mockOperationsGet.mockResolvedValue(mockOperationResult);

    await checkOperationHandler(req, res);

    expect(mockOperationsGet).toHaveBeenCalled();
    expect(updateEqMock).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        done: true,
        publicVideoUrl: expect.stringContaining('/api/media-proxy')
    }));
  });
});
