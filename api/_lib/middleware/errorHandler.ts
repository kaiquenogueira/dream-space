import type { VercelRequest, VercelResponse } from '../types.js';
import { AppError } from '../errors/AppError.js';

type HandlerFunction = (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>;

export const withErrorHandler = (handler: HandlerFunction): HandlerFunction => {
    return async (req: VercelRequest, res: VercelResponse) => {
        try {
            return await handler(req, res);
        } catch (error: any) {
            console.error(`[API Error] ${req.method} ${req.url}:`, error);

            if (error instanceof AppError) {
                return res.status(error.statusCode).json({
                    error: error.message,
                    ...error.payload
                });
            }

            // Handle Zod validation errors (if thrown directly instead of parsed safely)
            if (error.name === 'ZodError') {
                const errorMsg = error.issues?.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ');
                return res.status(400).json({ error: `Dados inválidos: ${errorMsg}` });
            }

            // Supabase errors
            if (error.code) {
                return res.status(500).json({ error: 'Falha na operação de banco de dados' });
            }

            // Default fallback
            return res.status(500).json({
                error: 'Erro interno do servidor',
                message: error.message || 'Erro desconhecido'
            });
        }
    };
};
