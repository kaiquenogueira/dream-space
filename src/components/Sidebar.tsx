import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import ImageUploader from './ImageUploader';
import { RefreshIcon, XIcon, CheckIcon } from './Icons';
import { UploadedImage, Property } from '../types';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';

import { useContainerSize } from '../hooks/useContainerSize';

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

const ImageItem = memo(({
  img,
  isSelected,
  onSelect,
  onToggleSelection,
  onRegenerate,
  onRemove,
  isGeneratingAll
}: {
  img: UploadedImage,
  isSelected: boolean,
  onSelect: (id: string) => void,
  onToggleSelection: (id: string) => void,
  onRegenerate: (id: string) => void,
  onRemove: (id: string, e: React.MouseEvent) => void,
  isGeneratingAll: boolean
}) => (
  <div
    onClick={() => onSelect(img.id)}
    className={`
       relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 h-full w-full
       ${isSelected
        ? 'border-secondary shadow-[0_0_15px_rgba(211,156,118,0.2)] scale-[1.02]'
        : 'border-white/5 hover:border-secondary/30 hover:shadow-[0_0_15px_rgba(211,156,118,0.1)] hover:scale-[1.02]'
      }
     `}
  >
    <img src={img.previewUrl || undefined} alt="Ambiente" className="w-full h-full object-cover" loading="lazy" />

    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

    {img.isGenerating && (
      <div className="absolute inset-0 bg-surface-dark/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5">
        <RefreshIcon className="animate-spin text-secondary w-5 h-5" />
        <span className="text-xs font-medium text-secondary-light uppercase tracking-wide">Desenhando...</span>
      </div>
    )}

    {img.error && (
      <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 px-2 text-center">
        <span className="text-xs text-white font-bold bg-red-500 px-2.5 py-0.5 rounded-full">Erro</span>
        <span className="text-[10px] text-red-100 leading-snug">{img.error}</span>
      </div>
    )}

    {!img.isGenerating && img.generatedUrl && (
      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-surface-dark/80 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
        <span>✓ Concluído</span>
      </div>
    )}

    {!img.isGenerating && img.iterateFromGenerated && (
      <div className="absolute top-1.5 left-1.5 mt-5 flex items-center gap-1 bg-secondary/80 backdrop-blur text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
        <span>Refinando</span>
      </div>
    )}

    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelection(img.id);
      }}
      className={`absolute bottom-1.5 left-1.5 w-9 h-9 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md z-10 ${img.selected
        ? 'bg-secondary border-secondary scale-100 opacity-100'
        : 'bg-black/50 border-white/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:border-white/70'
        }`}
      title={img.selected ? "Desmarcar" : "Selecionar para geração"}
      aria-label={img.selected ? "Desmarcar imagem" : "Selecionar imagem para geração"}
    >
      {img.selected && (
        <CheckIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-black" />
      )}
    </button>

    {!img.isGenerating && img.generatedUrl && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRegenerate(img.id);
        }}
        disabled={isGeneratingAll}
        className={`absolute bottom-1.5 right-1.5 w-9 h-9 sm:w-7 sm:h-7 bg-surface/90 backdrop-blur-md rounded-full flex items-center justify-center text-text-muted hover:text-secondary hover:bg-white transition-all shadow-lg border border-white/10 group/regen z-10 ${isGeneratingAll ? 'opacity-50 cursor-not-allowed' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
        title="Regerar design para esta foto"
      >
        <RefreshIcon className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isGeneratingAll ? '' : 'group-hover/regen:rotate-180 transition-transform duration-500'}`} />
      </button>
    )}

    <button
      onClick={(e) => {
        e.stopPropagation();
        onRemove(img.id, e);
      }}
      className="absolute top-1.5 right-1.5 w-9 h-9 sm:w-7 sm:h-7 bg-black/60 sm:bg-red-500/80 backdrop-blur-md text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-500 transition-all shadow-lg z-10 border border-white/20 sm:border-transparent"
      aria-label="Remover imagem"
    >
      <XIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
    </button>
  </div>
));

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
  const selectableImages = images.filter(img => !img.error);
  const selectedCount = images.filter(img => img.selected).length;
  const allSelected = selectableImages.length > 0 && selectedCount === selectableImages.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerSize(containerRef);

  const columnCount = 2;
  const rowCount = Math.ceil(images.length / columnCount);
  const gutter = 12;

  const gridWidth = width || 320;
  const itemWidth = Math.floor(gridWidth / columnCount);
  const itemHeight = Math.floor(itemWidth * (9 / 16)) + gutter;

  const Cell = useCallback(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * columnCount + columnIndex;

    const cellStyle = {
      ...style,
      left: Number(style.left) + gutter / 2,
      top: Number(style.top) + gutter / 2,
      width: Number(style.width) - gutter,
      height: Number(style.height) - gutter,
    };

    const img = images[index];
    if (!img) return null;

    return (
      <div style={cellStyle}>
        <ImageItem
          img={img}
          isSelected={selectedImageId === img.id}
          onSelect={setSelectedImageId}
          onToggleSelection={toggleImageSelection}
          onRegenerate={handleRegenerateSingle}
          onRemove={removeImage}
          isGeneratingAll={isGenerating}
        />
      </div>
    );
  }, [
    columnCount, gutter, images,
    selectedImageId, setSelectedImageId, toggleImageSelection,
    handleRegenerateSingle, removeImage, isGenerating
  ]);

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden">
      {!compact && (
        <div className="shrink-0 bg-surface/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
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

      <div className="flex-1 flex flex-col bg-surface/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden min-h-0">
        <div className="shrink-0 flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-normal font-heading text-white tracking-wide">{compact ? 'Fotos' : 'Espaços do Projeto'}</h2>
            <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted/70 mt-1">{compact ? 'Toque para editar' : 'Gerencie as fotos enviadas'}</p>
          </div>
          <span className="text-xs font-mono bg-primary-dark/80 text-secondary px-2.5 py-1 rounded-md border border-secondary/20 shadow-inner">
            {images.length}/{maxImages}
          </span>
        </div>

        {images.length > 0 && (
          <div className="shrink-0 flex items-center justify-between mb-4 px-1">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold uppercase tracking-wider text-text-muted hover:text-secondary transition-colors flex items-center gap-2"
            >
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${allSelected
                ? 'bg-secondary border-secondary shadow-[0_0_10px_rgba(211,156,118,0.3)]'
                : 'bg-primary-dark/50 border-white/20 hover:border-text-muted'
                }`}>
                {allSelected && (
                  <CheckIcon className="w-2.5 h-2.5 text-[#14161A]" />
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

        {compact ? (
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1.5 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2.5 px-1.5 pb-4">
              <div className="aspect-[4/3]">
                <ImageUploader
                  onImagesSelected={handleImagesSelected}
                  currentCount={images.length}
                  maxImages={maxImages}
                />
              </div>
              {images.map(img => (
                <div key={img.id} className="aspect-[4/3]">
                  <ImageItem
                    img={img}
                    isSelected={selectedImageId === img.id}
                    onSelect={setSelectedImageId}
                    onToggleSelection={toggleImageSelection}
                    onRegenerate={handleRegenerateSingle}
                    onRemove={removeImage}
                    isGeneratingAll={isGenerating}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 -mx-1.5" ref={containerRef}>
              {width > 0 && height > 0 && (
                <Grid
                  columnCount={columnCount}
                  columnWidth={itemWidth}
                  height={height}
                  rowCount={rowCount}
                  rowHeight={itemHeight}
                  width={width}
                  className="custom-scrollbar"
                >
                  {Cell}
                </Grid>
              )}
            </div>
            <div className="shrink-0 h-[120px] mt-4">
              <ImageUploader
                onImagesSelected={handleImagesSelected}
                currentCount={images.length}
                maxImages={maxImages}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
