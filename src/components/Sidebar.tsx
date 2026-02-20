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
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Project Branding</h3>
          <div className="flex items-center gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-all group">
            {activeProperty?.logo ? (
              <div className="relative w-11 h-11 bg-white rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-zinc-200 shadow-sm group/logo">
                <img src={activeProperty.logo} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                <button
                  onClick={() => setProperties(prev => prev.map(p => p.id === activePropertyId ? { ...p, logo: undefined } : p))}
                  className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity rounded-xl"
                  aria-label="Remove logo"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-11 h-11 bg-zinc-800/60 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-600/50 text-zinc-500 flex-shrink-0 group-hover:border-emerald-500/30 group-hover:text-emerald-400/60 transition-all">
                <span className="text-xs font-bold">LOGO</span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <label className="cursor-pointer group/label">
                <span className="block text-sm font-medium text-zinc-300 group-hover/label:text-white transition-colors">Upload Logo</span>
                <span className="block text-xs text-zinc-500 truncate">PNG, JPG (Max 2MB)</span>
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
      <div className="glass-card p-4">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">{compact ? 'Photos' : 'Project Spaces'}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{compact ? 'Tap to edit' : 'Manage your uploaded photos'}</p>
          </div>
          <span className="text-xs font-mono bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700/40">
            {images.length}/{maxImages}
          </span>
        </div>

        {/* Selection Controls */}
        {images.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-medium text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${allSelected
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-600 hover:border-zinc-400'
                }`}>
                {allSelected && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            {selectedCount > 0 && selectedCount < images.length && (
              <span className="text-xs text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {selectedCount} selected
              </span>
            )}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 gap-2.5">
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
                  ? 'border-emerald-500 ring-glow-emerald scale-[1.02]'
                  : 'border-zinc-800/40 hover:border-zinc-600/60 hover:scale-[1.02]'
                }
              `}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <img src={img.previewUrl} alt="Room" className="w-full h-full object-cover" />

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Generating */}
              {img.isGenerating && (
                <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5">
                  <RefreshIcon className="animate-spin text-emerald-400 w-5 h-5" />
                  <span className="text-xs font-medium text-emerald-300">Designing...</span>
                </div>
              )}

              {/* Error */}
              {img.error && (
                <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs text-white font-bold bg-red-500 px-2.5 py-0.5 rounded-full">Error</span>
                </div>
              )}

              {/* Done badge */}
              {!img.isGenerating && img.generatedUrl && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                  <span>✓ Done</span>
                </div>
              )}

              {/* Selection Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleImageSelection(img.id);
                }}
                className={`absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md ${img.selected
                  ? 'bg-emerald-500 border-emerald-400 scale-100'
                  : 'bg-black/40 border-white/40 opacity-0 group-hover:opacity-100 hover:border-white/70'
                  }`}
                title={img.selected ? "Deselect" : "Select for generation"}
                aria-label={img.selected ? "Deselect image" : "Select image for generation"}
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
                    ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-600/90 hover:bg-emerald-500 text-white hover:scale-110'
                    }`}
                  title="Regenerate this image"
                  aria-label="Regenerate this image"
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
                title="Remove image"
                aria-label="Remove image"
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
