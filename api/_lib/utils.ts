import { supabaseAdmin } from './supabaseAdmin.js';
import type { VercelRequest } from './types.js';

export const getClientIp = (req: VercelRequest): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return forwardedFor[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
};

export const recordMetric = async (params: {
    userId: string;
    endpoint: string;
    model?: string | null;
    success: boolean;
    errorMessage?: string | null;
    latencyMs?: number | null;
    inputBytes?: number | null;
    outputBytes?: number | null;
    creditsUsed?: number;
    estimatedCostUsd?: number | null;
}): Promise<void> => {
    if (!supabaseAdmin) return;
    try {
        await supabaseAdmin.from('generation_metrics').insert({
            user_id: params.userId,
            endpoint: params.endpoint,
            model: params.model,
            success: params.success,
            error_message: params.errorMessage ?? null,
            latency_ms: params.latencyMs ?? null,
            input_bytes: params.inputBytes ?? null,
            output_bytes: params.outputBytes ?? null,
            credits_used: params.creditsUsed ?? 0,
            estimated_cost_usd: params.estimatedCostUsd ?? null
        });
    } catch (error) {
        // Fail silently for metrics
        return;
    }
};
