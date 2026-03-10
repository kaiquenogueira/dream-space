import { z } from "zod";
import { withErrorHandler } from '../_lib/middleware/errorHandler.js';
import { withAuth, AuthenticatedRequest } from '../_lib/middleware/auth.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';
import { AppError, BadRequestError } from '../_lib/errors/AppError.js';
import type { VercelResponse } from '../_lib/types.js';

const CreatePresentationSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    pdf_url: z.string()
});

const handler = async (req: AuthenticatedRequest, res: VercelResponse) => {
    if (req.method !== 'POST') {
        throw new AppError('Método não permitido', 405);
    }

    if (!supabaseAdmin) {
        throw new AppError('Erro interno de configuração (Supabase)', 500);
    }

    const userId = req.auth.userId;

    // Validate request body
    const validation = CreatePresentationSchema.safeParse(req.body);
    if (!validation.success) {
        const errorMsg = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new BadRequestError(`Dados inválidos: ${errorMsg}`);
    }

    const { title, description, pdf_url } = validation.data;

    // Check user's plan and current presentation count
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        throw new AppError('Não foi possível obter o perfil do usuário.', 500);
    }

    if (profile.plan === 'free') {
        // Check if free user already has a presentation
        const { count, error: countError } = await supabaseAdmin
            .from('presentations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) {
            throw new AppError('Erro ao verificar limite de apresentações.', 500);
        }

        if (count && count >= 1) {
            throw new AppError('Limite alcançado. Faça upgrade para criar apresentações ilimitadas.', 403);
        }
    }

    // Insert Presentation
    const { data: presentation, error: presError } = await supabaseAdmin
        .from('presentations')
        .insert({
            user_id: userId,
            title: title || 'Minha Apresentação',
            description: description || '',
            pdf_url: pdf_url
        })
        .select()
        .single();

    if (presError || !presentation) {
        console.error("Presentation Insert Error:", presError);
        throw new AppError('Falha ao criar apresentação.', 500);
    }

    // Return succcess immediately (no presentation_images relation needed anymore)
    return res.status(200).json({
        message: 'Apresentação criada com sucesso',
        presentation_id: presentation.id,
        pdf_url: presentation.pdf_url
    });
};

export default withErrorHandler(withAuth(handler as any));
