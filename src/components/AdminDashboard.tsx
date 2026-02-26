import React, { useState, useEffect } from 'react';
import { adminService, AdminUser } from '../services/adminService';

interface AdminDashboardProps {
    onBack: () => void;
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
            const data = await adminService.fetchUsers();
            setUsers(data);
        } catch (err: unknown) {
            console.error("Error fetching users:", err);
            setError(err instanceof Error ? err.message : 'Falha desconhecida');
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
            await adminService.updateCredits(editingUser.id, creditsToChange);
            
            // Success
            setEditingUser(null);
            setCreditsToChange(0);
            fetchUsers(); // Refresh list
        } catch (err: unknown) {
            console.error("Error updating credits:", err);
            setError(err instanceof Error ? err.message : 'Falha ao atualizar créditos');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user: AdminUser) => {
        setEditingUser(user);
        setCreditsToChange(0); // Default to 0 change
    };

    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-surface-dark text-text-main p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="p-2 hover:bg-surface rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
                    </div>
                    <div className="text-sm text-text-muted">
                        {users.length} usuários encontrados
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="hover:text-white">✕</button>
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text"
                        placeholder="Buscar por email ou nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-glass-border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>

                {/* Users Table */}
                <div className="bg-surface border border-glass-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface-dark/50 border-b border-glass-border">
                                <tr>
                                    <th className="p-4 font-medium text-text-muted">Usuário</th>
                                    <th className="p-4 font-medium text-text-muted">Plano</th>
                                    <th className="p-4 font-medium text-text-muted">Créditos</th>
                                    <th className="p-4 font-medium text-text-muted">Cadastro</th>
                                    <th className="p-4 font-medium text-text-muted text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-glass-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-text-muted animate-pulse">
                                            Carregando usuários...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-text-muted">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-surface-dark/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-white">{user.full_name || 'Sem nome'}</div>
                                                <div className="text-text-muted text-xs">{user.email}</div>
                                                {user.is_admin && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-secondary/20 text-secondary text-[10px] font-bold rounded uppercase">Admin</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium capitalize
                                                    ${user.plan === 'pro' ? 'bg-purple-500/20 text-purple-300' : 
                                                      user.plan === 'starter' ? 'bg-amber-500/20 text-amber-300' : 
                                                      'bg-zinc-700/30 text-zinc-400'
                                                    }
                                                `}>
                                                    {user.plan}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-white">
                                                {user.credits_remaining}
                                            </td>
                                            <td className="p-4 text-text-muted">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => openEditModal(user)}
                                                    className="text-primary hover:text-primary/80 text-xs font-medium px-3 py-1.5 border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                                                >
                                                    Gerenciar Créditos
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

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-glass-border rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <h3 className="text-lg font-bold text-white">Gerenciar Créditos</h3>
                        <div className="text-sm text-text-muted">
                            Usuário: <span className="text-white">{editingUser.email}</span>
                            <br />
                            Atual: <span className="text-white">{editingUser.credits_remaining} créditos</span>
                        </div>

                        <form onSubmit={handleUpdateCredits} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-muted uppercase mb-2">
                                    Adicionar / Remover Créditos
                                </label>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setCreditsToChange(prev => prev - 10)}
                                        className="p-2 bg-surface-dark border border-glass-border rounded hover:bg-white/5"
                                    >
                                        -10
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setCreditsToChange(prev => prev - 1)}
                                        className="p-2 bg-surface-dark border border-glass-border rounded hover:bg-white/5"
                                    >
                                        -1
                                    </button>
                                    <input 
                                        type="number" 
                                        value={creditsToChange}
                                        onChange={(e) => setCreditsToChange(parseInt(e.target.value) || 0)}
                                        className="flex-1 bg-surface-dark border border-glass-border rounded p-2 text-center font-mono"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setCreditsToChange(prev => prev + 1)}
                                        className="p-2 bg-surface-dark border border-glass-border rounded hover:bg-white/5"
                                    >
                                        +1
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setCreditsToChange(prev => prev + 10)}
                                        className="p-2 bg-surface-dark border border-glass-border rounded hover:bg-white/5"
                                    >
                                        +10
                                    </button>
                                </div>
                                <div className="mt-2 text-xs text-center text-text-muted">
                                    Novo saldo: <span className="text-primary font-bold">{editingUser.credits_remaining + creditsToChange}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-2 border border-glass-border rounded hover:bg-white/5 transition-colors text-sm"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Salvando...' : 'Confirmar'}
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
