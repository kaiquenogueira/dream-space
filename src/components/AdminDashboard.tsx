import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../hooks/useAuth';

interface AdminDashboardProps {
    onBack: () => void;
}

interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    plan: string;
    credits_remaining: number;
    created_at: string;
    is_admin: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit modal state
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [creditsToChange, setCreditsToChange] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const res = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Falha ao buscar usuários');
            }

            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            console.error("Error fetching users:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCredits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const res = await fetch('/api/admin/credits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    targetUserId: editingUser.id,
                    creditsToAdd: creditsToChange
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Falha ao atualizar créditos');
            }

            const data = await res.json();

            // Update local state
            setUsers(users.map(u =>
                u.id === editingUser.id
                    ? { ...u, credits_remaining: data.newCredits }
                    : u
            ));

            setEditingUser(null);
            setCreditsToChange(0);

        } catch (err: any) {
            console.error("Error updating credits:", err);
            // Don't close modal on error so they can read it
            alert(`Erro ao atualizar créditos: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex-1 bg-surface-dark p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="p-2 bg-surface border border-glass-border rounded-sm text-text-muted hover:text-white hover:bg-surface-light transition-colors"
                                title="Voltar"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m15 18-6-6 6-6" />
                                </svg>
                            </button>
                            <h1 className="text-2xl font-bold font-heading text-text-main">Painel Administrativo</h1>
                        </div>
                        <p className="text-text-muted text-sm mt-1 ml-12">Gerencie usuários e conceda créditos.</p>
                    </div>

                    <div className="relative">
                        <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por email ou nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-surface border border-glass-border rounded-sm text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary min-w-[300px]"
                        />
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-sm text-red-400 text-sm flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={fetchUsers} className="underline hover:text-red-300">Tentar Novamente</button>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-surface/50 border border-glass-border rounded-sm overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-text-muted">
                            <thead className="bg-surface text-text-main border-b border-glass-border">
                                <tr>
                                    <th className="px-6 py-4 font-bold font-heading uppercase tracking-wider text-xs">Usuário</th>
                                    <th className="px-6 py-4 font-bold font-heading uppercase tracking-wider text-xs">Plano</th>
                                    <th className="px-6 py-4 font-bold font-heading uppercase tracking-wider text-xs">Créditos</th>
                                    <th className="px-6 py-4 font-bold font-heading uppercase tracking-wider text-xs">Data de Cadastro</th>
                                    <th className="px-6 py-4 font-bold font-heading uppercase tracking-wider text-xs text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-glass-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <svg className="animate-spin w-6 h-6 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                </svg>
                                                Carregando usuários...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-surface-light/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-surface border border-glass-border flex items-center justify-center text-text-muted font-bold uppercase text-xs flex-shrink-0">
                                                        {(user.full_name || user.email)[0]}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-text-main font-medium truncate">{user.full_name || 'Sem nome'}</span>
                                                        <span className="text-text-muted text-xs truncate flex items-center gap-2">
                                                            {user.email}
                                                            {user.is_admin && (
                                                                <span className="bg-secondary/20 text-secondary text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                                                    Admin
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${user.plan === 'free'
                                                    ? 'bg-surface-light text-text-muted border-glass-border'
                                                    : user.plan === 'pro'
                                                        ? 'bg-purple-900/20 text-purple-400 border-purple-500/20'
                                                        : 'bg-secondary/10 text-secondary border-secondary/20'
                                                    }`}>
                                                    {user.plan}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-text-main">{user.credits_remaining}</span>
                                                    <span className="text-xs text-text-muted">créditos</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-text-muted">
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setCreditsToChange(0);
                                                    }}
                                                    className="px-3 py-1.5 bg-surface-light hover:bg-surface text-text-muted hover:text-white rounded-sm text-xs font-medium transition-colors border border-glass-border focus-visible:ring-2 focus-visible:ring-secondary"
                                                >
                                                    Modificar Créditos
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Credits Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-glass-border rounded-sm shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                        <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between">
                            <h3 className="text-lg font-bold font-heading text-text-main">Modificar Créditos</h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-text-muted hover:text-white transition-colors"
                                disabled={isSubmitting}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUpdateCredits} className="p-6">
                            <div className="mb-6">
                                <p className="text-sm text-text-muted mb-4">
                                    Ajustando créditos para o usuário: <br />
                                    <strong className="text-text-main">{editingUser.email}</strong>
                                </p>

                                <div className="flex items-center justify-between bg-surface-dark p-4 rounded-sm border border-glass-border mb-6">
                                    <span className="text-text-muted text-sm">Créditos atuais</span>
                                    <span className="text-xl font-bold text-text-main">{editingUser.credits_remaining}</span>
                                </div>

                                <label className="block text-sm font-medium text-text-main mb-2">
                                    Adicionar (ou remover) créditos
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCreditsToChange(prev => prev - 10)}
                                        className="p-3 bg-surface-light rounded-sm text-text-muted hover:text-white hover:bg-surface transition"
                                    >
                                        -10
                                    </button>
                                    <input
                                        type="number"
                                        value={creditsToChange}
                                        onChange={(e) => setCreditsToChange(parseInt(e.target.value) || 0)}
                                        className="flex-1 text-center py-3 bg-surface-dark border border-glass-border rounded-sm text-text-main font-bold text-lg focus:outline-none focus:border-secondary"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCreditsToChange(prev => prev + 10)}
                                        className="p-3 bg-surface-light rounded-sm text-text-muted hover:text-white hover:bg-surface transition"
                                    >
                                        +10
                                    </button>
                                </div>
                                <p className="text-xs text-text-muted mt-2 text-center">
                                    Novo total será: <strong className={editingUser.credits_remaining + creditsToChange < 0 ? "text-red-400" : "text-secondary"}>
                                        {Math.max(0, editingUser.credits_remaining + creditsToChange)}
                                    </strong>
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 px-4 bg-surface-light hover:bg-surface text-white rounded-sm font-medium transition-colors uppercase tracking-wide text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || creditsToChange === 0}
                                    className="flex-1 py-2.5 px-4 bg-secondary hover:bg-secondary-dark text-black rounded-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide text-xs font-bold"
                                >
                                    {isSubmitting ? (
                                        <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Salvando...</>
                                    ) : (
                                        'Confirmar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
