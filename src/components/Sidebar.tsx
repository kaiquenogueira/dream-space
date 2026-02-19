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
  handleLogoUpload
}) => {
  return (
    <div className="lg:col-span-3 space-y-4">
      <div className="flex justify-between items-center mb-2">
         <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold">My Spaces ({images.length}/{maxImages})</h2>
      </div>
      
      <div className="space-y-3">
        {images.map(img => (
          <div 
            key={img.id}
            onClick={() => setSelectedImageId(img.id)}
            className={`
              relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-video flex-shrink-0
              ${selectedImageId === img.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-600'}
            `}
          >
            {/* Always show original previewUrl in the sidebar list */}
            <img src={img.previewUrl} alt="Room" className="w-full h-full object-cover" />
            
            {/* Status Overlays */}
            {img.isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <RefreshIcon className="animate-spin text-blue-400 w-6 h-6" />
              </div>
            )}
            {img.error && (
              <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                 <span className="text-xs text-red-200 font-bold bg-red-900 px-2 py-1 rounded">Error</span>
              </div>
            )}
            {!img.isGenerating && img.generatedUrl && (
               <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            )}

            <button 
              onClick={(e) => removeImage(img.id, e)}
              className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
            >
              <XIcon />
            </button>
          </div>
        ))}
        
        <ImageUploader 
          onImagesSelected={handleImagesSelected} 
          currentCount={images.length}
          maxImages={maxImages}
        />

        {/* Branding Section */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Project Branding</h3>
          <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
            {activeProperty?.logo ? (
              <div className="relative group w-10 h-10 bg-white rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                <img src={activeProperty.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                <button 
                  onClick={() => setProperties(prev => prev.map(p => p.id === activePropertyId ? { ...p, logo: undefined } : p))}
                  className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-dashed border-slate-600 text-slate-500 flex-shrink-0">
                <span className="text-[10px]">Logo</span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <label className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 font-medium truncate block">
                {activeProperty?.logo ? 'Change Logo' : 'Upload Agency Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              <p className="text-xs text-slate-500 truncate">Added to comparison exports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
