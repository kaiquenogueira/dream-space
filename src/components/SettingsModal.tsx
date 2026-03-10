import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../hooks/useAuth';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile | null;
    onProfileUpdate: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, profile, onProfileUpdate }) => {
    const [agencyName, setAgencyName] = useState(profile?.agency_name || '');
    const [contactPhone, setContactPhone] = useState(profile?.contact_phone || '');
    const [contactEmail, setContactEmail] = useState(profile?.contact_email || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !profile) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    agency_name: agencyName.trim(),
                    contact_phone: contactPhone.trim(),
                    contact_email: contactEmail.trim(),
                })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            onProfileUpdate();
            onClose();
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError('Falha ao salvar configurações. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError('A logo deve ter no máximo 2MB.');
            return;
        }

        setIsUploadingLogo(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}/logo_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('brand_assets')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('brand_assets')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ agency_logo: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            onProfileUpdate();
        } catch (err: any) {
            console.error('Error uploading logo:', err);
            setError('Falha ao fazer upload da logo.');
        } finally {
            setIsUploadingLogo(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in custom-scrollbar">
            <div
                className="bg-surface-dark w-full max-w-lg rounded-2xl border border-glass-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-glass-border">
                    <h2 className="text-xl font-semibold text-text-main flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        Configurações da Imobiliária
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text-main bg-surface/50 hover:bg-surface border border-transparent hover:border-glass-border transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-text-main mb-1">Logo da Agência</h3>
                            <p className="text-xs text-text-muted mb-3">Esta logo aparecerá no topo da página ao compartilhar apresentações com seus clientes.</p>

                            <div className="flex items-center gap-4 border border-dashed border-glass-border p-4 rounded-xl bg-surface/30">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface flex items-center justify-center border border-glass-border flex-shrink-0">
                                    {profile.agency_logo ? (
                                        <img src={profile.agency_logo} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleLogoUpload}
                                        disabled={isUploadingLogo}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingLogo}
                                        className="text-sm px-4 py-2 bg-surface hover:bg-surface-light text-text-main border border-glass-border rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-medium focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                    >
                                        {isUploadingLogo ? (
                                            <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Enviando...</span>
                                        ) : (
                                            <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg> Trocar Logo</span>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-text-muted mt-2">Formatos: JPG, PNG. Máx: 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5 flex-1">
                                <label htmlFor="agencyName" className="text-xs font-semibold text-text-muted uppercase tracking-wider">Nome da Agência / Corretor</label>
                                <input
                                    id="agencyName"
                                    type="text"
                                    value={agencyName}
                                    onChange={(e) => setAgencyName(e.target.value)}
                                    placeholder="Sua Imobiliária Ltda"
                                    className="w-full bg-surface border border-glass-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <label htmlFor="contactPhone" className="text-xs font-semibold text-text-muted uppercase tracking-wider">Telefone (WhatsApp)</label>
                                <input
                                    id="contactPhone"
                                    type="text"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    className="w-full bg-surface border border-glass-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <label htmlFor="contactEmail" className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email de Contato</label>
                                <input
                                    id="contactEmail"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder="contato@agencia.com"
                                    className="w-full bg-surface border border-glass-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-glass-border bg-surface/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-white bg-surface hover:bg-surface-light border border-glass-border transition-all focus:outline-none focus:ring-2 focus:ring-glass-border"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-secondary to-secondary-light hover:from-secondary-dark hover:to-secondary text-black shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-2 focus:ring-offset-surface-dark"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
