import type { VercelRequest, VercelResponse } from '../types.js';
import { supabaseAdmin } from '../supabaseAdmin.js';
import { UnauthorizedError } from '../errors/AppError.js';

export interface AuthContext {
    userId: string;
}

export interface AuthenticatedRequest extends VercelRequest {
    auth: AuthContext;
}

type AuthenticatedHandlerFunction = (req: AuthenticatedRequest, res: VercelResponse) => Promise<VercelResponse | void>;

export const withAuth = (handler: AuthenticatedHandlerFunction): ((req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>) => {
    return async (req: VercelRequest, res: VercelResponse) => {
        if (!supabaseAdmin) {
            console.error("[API] Supabase Admin client is not initialized.");
            throw new Error('Erro de configuração do servidor: Credenciais do Supabase ausentes');
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Não autorizado: Token ausente ou inválido');
        }

        const token = authHeader.split(' ')[1];

        try {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (error || !user) {
                throw new UnauthorizedError('Não autorizado: Token inválido');
            }

            // Cast req to AuthenticatedRequest and inject auth context
            (req as AuthenticatedRequest).auth = { userId: user.id };

            return await handler(req as AuthenticatedRequest, res);
        } catch (error) {
            if (error instanceof UnauthorizedError) throw error;
            console.error("[API] Auth check failed:", error);
            throw new UnauthorizedError('Não autorizado: Falha na validação do token');
        }
    };
};
