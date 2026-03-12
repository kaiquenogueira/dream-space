import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/generate';
import { supabaseAdmin } from '../../api/_lib/supabaseAdmin.js';
import { checkRateLimit } from '../../api/_lib/rateLimit.js';

vi.mock('../../api/_lib/middleware/auth.js', () => ({
  withAuth: vi.fn((routeHandler) => {
    return async (req: any, res: any) => {
      const authHeader = req.headers?.authorization;
      if (!authHeader || authHeader === 'Bearer ') {
        return res.status(401).json({ error: 'Não autorizado' });
      }
      req.auth = { userId: 'user-1' };
      return routeHandler(req, res);
    };
  })
}));

// Mock das dependências
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'path/to/image.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://url' } }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed-url' }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null })
      })
    }
  },
}));

vi.mock('../../api/_lib/rateLimit.js', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../api/_lib/promptBuilder.js', () => ({
  buildPrompt: vi.fn().mockReturnValue('mocked prompt'),
  GenerationMode: { VIRTUAL_STAGING: 'Virtual Staging (Mobiliar)' },
  ArchitecturalStyle: { MODERN: 'Modern' }
}));

// Mock global do GoogleGenerativeAI
const { mockGenerateContent, mockGenerateImages } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGenerateImages: vi.fn(),
}));

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      constructor() { }
      models = {
        generateContent: mockGenerateContent,
        generateImages: mockGenerateImages,
      };
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
          generateImages: mockGenerateImages,
        };
      }
    }
  };
});

describe('API Generate Handler', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';

    req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-length': '100'
      },
      body: {
        imageBase64: 'base64data',
        generationMode: 'Virtual Staging (Mobiliar)'
      },
      socket: { remoteAddress: '127.0.0.1' }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Default mocks
    (supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { credits_remaining: 10, plan: 'free' }, error: null })
        })
      }),
      insert: vi.fn().mockResolvedValue({ error: null })
    });
    (checkRateLimit as any).mockResolvedValue({ success: true });
    (supabaseAdmin.rpc as any).mockResolvedValue({ data: 9, error: null });
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: 'generated-image-base64'
                  }
                }
              ]
            }
          }
        ],
        usageMetadata: { totalTokenCount: 10 }
      }
    });
    mockGenerateImages.mockResolvedValue({
      generatedImages: [
        {
          image: {
            imageBytes: 'generated-image-base64'
          }
        }
      ]
    });
  });

  it('deve retornar 405 se método não for POST', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve retornar 401 se token for inválido', async () => {
    req.headers.authorization = '';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve retornar 429 se rate limit excedido', async () => {
    (checkRateLimit as any).mockResolvedValue({ success: false });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('deve processar geração com sucesso', async () => {
    await handler(req, res);

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('decrement_credits', expect.anything());
    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-flash-image'
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      result: 'http://signed-url',
      credits_remaining: 9
    }));
  });

  it('deve aceitar resposta do Gemini no formato generatedImages', async () => {
    mockGenerateContent.mockResolvedValue({
      generatedImages: [
        {
          image: {
            imageBytes: 'generated-image-base64-alt'
          }
        }
      ]
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      result: 'http://signed-url',
      credits_remaining: 9
    }));
  });

  it('deve retornar 500 quando o Gemini não retornar imagem', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: 'only text' }]
            }
          }
        ]
      }
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Nenhuma imagem gerada pelo modelo.'
    }));
  });

  it('deve retornar 500 quando falha o upload da imagem gerada', async () => {
    (supabaseAdmin.storage.from as any).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'upload failed' } }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://url' } }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed-url' }, error: null }),
      remove: vi.fn().mockResolvedValue({ error: null })
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Falha ao fazer upload da imagem gerada'
    }));
  });

  it('deve retornar 403 se sem créditos', async () => {
    (supabaseAdmin.rpc as any).mockRejectedValue({ message: 'insufficient_credits' });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Créditos insuficientes'
    }));
  });
});
