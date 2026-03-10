import { supabaseAdmin } from '../supabaseAdmin.js';
import { AppError } from '../errors/AppError.js';

export class CreditService {
    /**
     * Decrements credits. Throws a 403 AppError if insufficient.
     */
    static async reserveCredits(userId: string, amount: number = 1): Promise<number> {
        if (!supabaseAdmin) throw new Error('Supabase admin not initialized');

        try {
            const { data, error } = await supabaseAdmin.rpc('decrement_credits', {
                p_user_id: userId,
                p_amount: amount
            });

            if (error) throw error;
            return data; // remaining credits
        } catch (error: any) {
            const message = error?.message?.toLowerCase() || '';
            if (message.includes('insufficient_credits')) {

                // Fetch plan to provide better error message
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('plan, credits_remaining')
                    .eq('id', userId)
                    .single();

                throw new AppError(
                    'Créditos insuficientes',
                    403,
                    {
                        credits_remaining: profile?.credits_remaining || 0,
                        plan: profile?.plan || 'free',
                        message: `Esta operação custa ${amount} crédito(s). Adquira mais créditos ou faça upgrade do seu plano para continuar.`
                    }
                );
            }
            console.error("[CreditService] Failed to reserve credit:", error);
            throw new AppError('Falha ao reservar créditos', 500);
        }
    }

    /**
     * Increments credits back (refund) in case of failure downstream.
     */
    static async refundCredits(userId: string, amount: number = 1): Promise<void> {
        if (!supabaseAdmin) return;
        try {
            await supabaseAdmin.rpc('increment_credits', {
                p_user_id: userId,
                p_amount: amount
            });
        } catch (error) {
            console.error("[CreditService] Failed to refund credits:", error);
            // We don't throw here usually, because this is often in a catch block
            // and we don't want to mask the original error.
        }
    }

    /**
     * Fetches user's current credits and plan info
     */
    static async getProfile(userId: string) {
        if (!supabaseAdmin) throw new Error('Supabase admin not initialized');

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('credits_remaining, plan')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            console.error("[CreditService] Profile fetch failed:", error);
            throw new AppError('Falha ao buscar perfil do usuário', 500);
        }

        return profile;
    }
}
