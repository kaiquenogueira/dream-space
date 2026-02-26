import { supabase } from '../lib/supabase';

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    plan: string;
    credits_remaining: number;
    created_at: string;
    is_admin: boolean;
}

const getApiUrl = (path: string) => {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (!base) return path;
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
};

const parseResponse = async <T>(res: Response): Promise<{ data: T | null, rawText: string }> => {
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!text) {
        return { data: null, rawText: '' };
    }
    if (contentType.includes('application/json')) {
        try {
            return { data: JSON.parse(text), rawText: text };
        } catch {
            return { data: null, rawText: text };
        }
    }
    return { data: null, rawText: text };
};

export const adminService = {
    fetchUsers: async (): Promise<AdminUser[]> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Não autenticado');

        const res = await fetch(getApiUrl('/api/admin/users'), {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const { data, rawText } = await parseResponse<AdminUser[]>(res);
        if (!res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMsg = (data as any)?.error || (data as any)?.message || rawText || 'Falha ao buscar usuários';
            throw new Error(errorMsg);
        }
        if (!data) {
            throw new Error('Resposta inválida da API. Inicie o backend com vercel dev.');
        }
        return data;
    },

    updateCredits: async (userId: string, credits: number): Promise<void> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Não autenticado');

        const res = await fetch(getApiUrl('/api/admin/credits'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ userId, credits })
        });

        const { data, rawText } = await parseResponse(res);
        if (!res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMsg = (data as any)?.error || (data as any)?.message || rawText || 'Falha ao atualizar créditos';
            throw new Error(errorMsg);
        }
    }
};
