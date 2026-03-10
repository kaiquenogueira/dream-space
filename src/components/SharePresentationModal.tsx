import React, { useState, useRef } from 'react';
import type { UploadedImage } from '../types';
import type { UserProfile } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import PdfPresentationTemplate from './PdfPresentationTemplate';

interface SharePresentationModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: UploadedImage[];
    profile: UserProfile | null;
    propertyTitle?: string;
}

const SharePresentationModal: React.FC<SharePresentationModalProps> = ({ isOpen, onClose, images, profile, propertyTitle }) => {
    const [title, setTitle] = useState(propertyTitle || '');
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const pdfContainerRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    // We can only share images that have been generated
    const generatableImages = images.filter(img => img.id && img.generatedUrl);

    const handleCreate = async () => {
        if (generatableImages.length === 0) {
            setError('Apresentações precisam de no mínimo 1 imagem gerada.');
            return;
        }

        if (!pdfContainerRef.current) return;

        setIsGenerating(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Falha de autenticação');

            // 1. Convert HTML to PDF using html2canvas & jsPDF
            const pages = pdfContainerRef.current.querySelectorAll('.pdf-page');

            // A4 format dimensions in pt (standard for jsPDF)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            for (let i = 0; i < pages.length; i++) {
                const pageEl = pages[i] as HTMLElement;
                const canvas = await html2canvas(pageEl, {
                    scale: 2, // High quality
                    useCORS: true,
                    allowTaint: true,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            const pdfBlob = pdf.output('blob');

            // 2. Trigger download immediately
            saveAs(pdfBlob, `Apresentacao_IOLIA_${Date.now()}.pdf`);

            // 3. Register Presentation via API Limits (using dummy URL since we don't upload anymore)
            const response = await fetch('/api/presentations/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    pdf_url: 'local_download_only'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // We still downloaded it, but let's notify the user if registration failed (meaning limits were hit)
                throw new Error(data.error || data.message || 'Erro ao registrar limites da apresentação. Seu PDF foi baixado.');
            }

            setGeneratedLink('success'); // Flag to show the success view
        } catch (err: any) {
            setError(err.message || 'Falha na conexão com o servidor');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in custom-scrollbar">
            <div
                className="bg-surface-dark w-full max-w-lg rounded-2xl border border-glass-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-glass-border">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Gerar Apresentação em PDF
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg text-text-muted hover:text-text-main bg-surface/50 hover:bg-surface border border-transparent hover:border-glass-border transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                    {profile?.plan === 'free' && !generatedLink && (
                        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            <div className="text-xs text-amber-500">
                                <strong className="block mb-0.5 font-bold">Aviso do Plano Gratuito</strong>
                                Usuários gratuitos possuem direito a apenas 1 Link de Apresentação ativo.<br />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl flex items-start gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {error}
                        </div>
                    )}

                    {generatedLink ? (
                        <div className="space-y-4 text-center py-4">
                            {generatedLink && generatedLink === 'success' && (
                                <div className="p-6 bg-emerald-500/10 border-t border-emerald-500/20 text-center">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">PDF Gerado com Sucesso!</h3>
                                    <p className="text-sm text-text-muted mb-4">
                                        O arquivo PDF foi baixado automaticamente para o seu dispositivo.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 text-white transition-all w-full md:w-auto"
                                    >
                                        Concluir
                                    </button>
                                </div>
                            )}                </div>
                    ) : (
                        <>
                            <div className="space-y-1.5 flex-1">
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Título da Apresentação</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Living e Varanda - Apto Jardins"
                                    className="w-full bg-surface border border-glass-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Descrição (Opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Confira as possibilidades de design para o seu futuro imóvel..."
                                    className="w-full h-24 bg-surface border border-glass-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-medium resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">Imagens Inclusas ({generatableImages.length})</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                    {generatableImages.length === 0 ? (
                                        <p className="text-sm text-text-muted italic">Gere imagens antes de compartilhar.</p>
                                    ) : (
                                        generatableImages.map(img => (
                                            <div key={img.id} className="relative w-16 h-16 rounded-xl flex-shrink-0 border border-glass-border overflow-hidden bg-surface">
                                                <img src={img.previewUrl || undefined} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {!generatedLink && (
                    <div className="p-5 border-t border-glass-border bg-surface/30 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-white bg-surface hover:bg-surface-light border border-glass-border transition-all focus:outline-none focus:ring-2 focus:ring-glass-border"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isGenerating || generatableImages.length === 0}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-secondary to-secondary-light hover:from-secondary-dark hover:to-secondary text-black shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-2 focus:ring-offset-surface-dark"
                        >
                            {isGenerating ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Gerando PDF...</> : 'Gerar PDF Inteligente'}
                        </button>
                    </div>
                )}
            </div>

            <PdfPresentationTemplate
                ref={pdfContainerRef}
                images={generatableImages}
                profile={profile}
                title={title}
                description={description}
            />
        </div>
    );
};

export default SharePresentationModal;
