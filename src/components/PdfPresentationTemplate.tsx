import React, { forwardRef } from 'react';
import type { UploadedImage } from '../types';
import type { UserProfile } from '../hooks/useAuth';

interface PdfPresentationTemplateProps {
    images: UploadedImage[];
    profile: UserProfile | null;
    title?: string;
    description?: string;
}

// A4 proportions: roughly 1:1.414. We use a fixed width/height for consistent rendering
// 794px x 1123px at 96 DPI is standard A4 size
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const PdfPresentationTemplate = forwardRef<HTMLDivElement, PdfPresentationTemplateProps>(
    ({ images, profile, title, description }, ref) => {

        return (
            <div
                ref={ref}
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: 0,
                    width: `${PAGE_WIDTH}px`,
                    backgroundColor: '#ffffff'
                }}
            >
                {/* Pages */}
                {images.map((img, index) => (
                    <div
                        key={img.id}
                        className="pdf-page relative overflow-hidden"
                        style={{
                            width: `${PAGE_WIDTH}px`,
                            height: `${PAGE_HEIGHT}px`,
                            pageBreakAfter: 'always',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: '#FCFBFA', // Off-white premium paper feel
                            fontFamily: '"Lato", sans-serif'
                        }}
                    >
                        {/* Top Accent Bar */}
                        <div style={{ height: '8px', backgroundColor: '#111318', width: '100%' }}>
                            <div style={{ height: '2px', backgroundColor: '#C9956C', width: '40%', marginTop: '3px' }}></div>
                        </div>

                        {/* Header */}
                        <header className="flex items-start justify-between px-12 pt-10 pb-6">
                            <div className="flex flex-col gap-2">
                                {profile?.agency_logo && (
                                    <img src={profile.agency_logo} alt="Logo" className="h-12 object-contain" crossOrigin="anonymous" />
                                )}
                                {profile?.agency_name && (
                                    <h1 className="m-0" style={{ fontFamily: '"Playfair Display", "Times New Roman", serif', fontSize: '24px', color: '#111318', letterSpacing: '0.05em' }}>
                                        {profile.agency_name}
                                    </h1>
                                )}
                            </div>
                            <div className="text-right flex flex-col justify-end" style={{ color: '#6b7280', fontSize: '12px', lineHeight: '1.6' }}>
                                {profile?.contact_phone && <div>{profile.contact_phone}</div>}
                                {profile?.contact_email && <div>{profile.contact_email}</div>}
                            </div>
                        </header>

                        {/* Content */}
                        <div className="px-12 flex-1 flex flex-col">
                            {index === 0 && (title || description) && (
                                <div className="mb-8 pb-6" style={{ borderBottom: '1px solid rgba(201, 149, 108, 0.3)' }}>
                                    {title && (
                                        <h2 style={{ fontFamily: '"Playfair Display", "Times New Roman", serif', fontSize: '32px', color: '#111318', marginBottom: '8px', lineHeight: '1.2' }}>
                                            {title}
                                        </h2>
                                    )}
                                    {description && (
                                        <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.6', maxWidth: '85%' }}>
                                            {description}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="w-full flex-1 flex flex-col gap-8 justify-center pb-8">
                                {/* After Image (Proposta) - Prominent */}
                                {img.generatedUrl && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div style={{ width: '30px', height: '1px', backgroundColor: '#C9956C' }}></div>
                                            <span style={{ fontFamily: '"Lato", sans-serif', color: '#111318', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                                Proposta de Design
                                            </span>
                                        </div>
                                        <div
                                            className="w-full relative rounded-sm overflow-hidden flex items-center justify-center bg-white"
                                            style={{ boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.08)', border: '1px solid #f3f4f6' }}
                                        >
                                            <img src={img.generatedUrl || undefined} alt="Proposta" className="w-full h-auto object-contain max-h-[380px]" crossOrigin="anonymous" />
                                        </div>
                                    </div>
                                )}

                                {/* Before Image (Estado Atual) - Secondary */}
                                {img.originalPath && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div style={{ width: '30px', height: '1px', backgroundColor: '#9ca3af' }}></div>
                                            <span style={{ fontFamily: '"Lato", sans-serif', color: '#6b7280', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                                Estado Atual
                                            </span>
                                        </div>
                                        <div
                                            className="w-full relative rounded-sm overflow-hidden flex items-center justify-center bg-white"
                                            style={{ border: '1px solid #e5e7eb' }}
                                        >
                                            <img src={img.previewUrl || undefined} alt="Original" className="w-full h-auto object-contain max-h-[320px]" crossOrigin="anonymous" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <footer
                            className="px-12 py-8 flex justify-between items-center"
                            style={{ color: '#9ca3af', fontSize: '10px', letterSpacing: '0.05em', borderTop: '1px solid #f3f4f6' }}
                        >
                            <p>GERADO EM {new Date().toLocaleDateString('pt-BR')}</p>
                            <div className="flex items-center gap-2">
                                <span style={{ fontFamily: '"Playfair Display", "Times New Roman", serif', fontStyle: 'italic' }}>Powered by</span>
                                <strong style={{ color: '#111318', fontWeight: 700, letterSpacing: '0.1em' }}>IOLIA AI</strong>
                            </div>
                        </footer>
                    </div>
                ))}
            </div>
        );
    }
);

PdfPresentationTemplate.displayName = 'PdfPresentationTemplate';

export default PdfPresentationTemplate;

