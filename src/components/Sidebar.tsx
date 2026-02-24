import React from 'react';
import ImageUploader from './ImageUploader';
import { RefreshIcon, XIcon } from './Icons';
import { UploadedImage, Property } from '../types';

interface SidebarProps {
  images: UploadedImage[];
  selectedImageId: string | null;
  setSelectedImageId: (id: string) => void;
  removeImage: (id: string, e: React.MouseEvent) => void;
  handleImagesSelected: (newImages: UploadedImage[]) => void;
  maxImages: number;
  activeProperty: Property | undefined;
  activePropertyId: string | null;
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleImageSelection: (id: string) => void;
  toggleSelectAll: () => void;
  handleRegenerateSingle: (imageId: string) => void;
  isGenerating: boolean;
  compact?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  images,
  selectedImageId,
  setSelectedImageId,
  removeImage,
  handleImagesSelected,
  maxImages,
  activeProperty,
  activePropertyId,
  setProperties,
  handleLogoUpload,
  toggleImageSelection,
  toggleSelectAll,
  handleRegenerateSingle,
  isGenerating,
  compact = false
}) => {
  const selectedCount = images.filter(img => img.selected).length;
  const allSelected = images.length > 0 && selectedCount === images.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Branding Section — hidden in compact (mobile) mode */}
      {!compact && (
        <div className="bg-surface/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
          <h3 className="text-[10px] font-bold text-text-muted/70 uppercase tracking-widest mb-4">Identidade Visual do Projeto</h3>
          <div className="flex items-center gap-4 bg-primary-dark/60 p-4 rounded-xl border border-white/5 hover:border-secondary/30 transition-all group">
            {activeProperty?.logo ? (
              <div className="relative w-12 h-12 bg-white rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-white/10 shadow-sm group/logo">
                <img src={activeProperty.logo} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                <button
                  onClick={() => setProperties(prev => prev.map(p => p.id === activePropertyId ? { ...p, logo: undefined } : p))}
                  className="absolute inset-0 bg-primary-dark/80 text-secondary opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity rounded-xl"
                  aria-label="Remover logo"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="w-12 h-12 bg-primary-dark/80 rounded-xl flex items-center justify-center border border-dashed border-white/20 text-text-muted flex-shrink-0 group-hover:border-secondary/40 group-hover:text-secondary transition-all shadow-inner">
                <span className="text-[10px] font-bold tracking-widest">LOGO</span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <label className="cursor-pointer group/label">
                <span className="block text-sm font-bold text-text-main group-hover/label:text-white transition-colors">Enviar Logo</span>
                <span className="block text-[10px] font-medium text-text-muted/50 truncate uppercase tracking-widest mt-0.5">PNG, JPG (Máx 2MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Gallery Section */}
      <div className="bg-surface/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-normal font-heading text-white tracking-wide">{compact ? 'Fotos' : 'Espaços do Projeto'}</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted/70 mt-1">{compact ? 'Toque para editar' : 'Gerencie as fotos enviadas'}</p>
          </div>
          <span className="text-xs font-mono bg-primary-dark/80 text-secondary px-2.5 py-1 rounded-md border border-secondary/20 shadow-inner">
            {images.length}/{maxImages}
          </span>
        </div>

        {/* Selection Controls */}
        {images.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold uppercase tracking-wider text-text-muted hover:text-secondary transition-colors flex items-center gap-2"
            >
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${allSelected
                ? 'bg-secondary border-secondary shadow-[0_0_10px_rgba(211,156,118,0.3)]'
                : 'bg-primary-dark/50 border-white/20 hover:border-text-muted'
                }`}>
                {allSelected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#14161A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {allSelected ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            {selectedCount > 0 && selectedCount < images.length && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded-sm border border-secondary/20">
                {selectedCount} selecionada(s)
              </span>
            )}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="aspect-video">
            <ImageUploader
              onImagesSelected={handleImagesSelected}
              currentCount={images.length}
              maxImages={maxImages}
            />
          </div>

          {images.map((img, i) => (
            <div
              key={img.id}
              onClick={() => setSelectedImageId(img.id)}
              className={`
                 relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 aspect-video
                 ${selectedImageId === img.id
                  ? 'border-secondary shadow-[0_0_15px_rgba(211,156,118,0.2)] scale-[1.02]'
                  : 'border-white/5 hover:border-secondary/30 hover:shadow-[0_0_15px_rgba(211,156,118,0.1)] hover:scale-[1.02]'
                }
               `}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <img src={img.previewUrl} alt="Ambiente" className="w-full h-full object-cover" />

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Generating */}
              {img.isGenerating && (
                <div className="absolute inset-0 bg-surface-dark/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5">
                  <RefreshIcon className="animate-spin text-secondary w-5 h-5" />
                  <span className="text-xs font-medium text-secondary-light uppercase tracking-wide">Desenhando...</span>
                </div>
              )}

              {/* Error */}
              {img.error && (
                <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs text-white font-bold bg-red-500 px-2.5 py-0.5 rounded-full">Erro</span>
                </div>
              )}

              {/* Done badge */}
              {!img.isGenerating && img.generatedUrl && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-primary/90 backdrop-blur text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                  <span>✓ Concluído</span>
                </div>
              )}

              {/* Selection Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleImageSelection(img.id);
                }}
                className={`absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md ${img.selected
                  ? 'bg-primary border-primary scale-100'
                  : 'bg-black/40 border-white/40 opacity-0 group-hover:opacity-100 hover:border-white/70'
                  }`}
                title={img.selected ? "Desmarcar" : "Selecionar para geração"}
                aria-label={img.selected ? "Desmarcar imagem" : "Selecionar imagem para geração"}
              >
                {img.selected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              {/* Regenerate button (for already generated images) */}
              {!img.isGenerating && img.generatedUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerateSingle(img.id);
                  }}
                  disabled={isGenerating}
                  className={`absolute bottom-1.5 right-1.5 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md ${isGenerating
                    ? 'bg-surface/60 text-text-muted cursor-not-allowed'
                    : 'bg-primary-dark/90 hover:bg-primary text-white hover:scale-110'
                    }`}
                  title="Gerar novamente esta imagem"
                  aria-label="Gerar novamente esta imagem"
                >
                  <RefreshIcon className="w-3 h-3" />
                </button>
              )}

              {/* Remove */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id, e);
                }}
                className="absolute top-1.5 right-1.5 p-1.5 bg-black/40 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                title="Remover imagem"
                aria-label="Remover imagem"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
