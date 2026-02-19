import React from 'react';
import { LayoutIcon, DownloadIcon, ColumnsIcon } from './Icons';
import { UploadedImage } from '../types';

interface PreviewAreaProps {
  activeImage: UploadedImage | undefined;
  imageIndex: number;
  viewMode: 'original' | 'generated' | 'split';
  setViewMode: (mode: 'original' | 'generated' | 'split') => void;
  handleDownloadComparison: (originalUrl: string, generatedUrl: string) => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({
  activeImage,
  imageIndex,
  viewMode,
  setViewMode,
  handleDownloadComparison
}) => {
  if (!activeImage) {
    return (
      <div className="h-[40vh] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        <LayoutIcon />
        <p className="mt-4 text-lg">Upload photos to start designing</p>
      </div>
    );
  }

  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          Preview: <span className="text-blue-400 text-base font-normal">Image {imageIndex + 1}</span>
        </h3>
        
        <div className="flex items-center bg-slate-800 rounded-lg p-1">
           <button 
             onClick={() => setViewMode('original')}
             className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'original' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
           >
             Original
           </button>
           <button 
             onClick={() => setViewMode('generated')}
             className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'generated' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             disabled={!activeImage.generatedUrl && !activeImage.isGenerating}
           >
             Result
           </button>
           <button 
             onClick={() => setViewMode('split')}
             className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1 ${viewMode === 'split' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             disabled={!activeImage.generatedUrl && !activeImage.isGenerating}
           >
             <ColumnsIcon /> Side-by-Side
           </button>
        </div>

        {activeImage.generatedUrl && (
          <div className="flex gap-2">
            <button 
              onClick={() => handleDownloadComparison(activeImage.previewUrl, activeImage.generatedUrl!)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors text-sm font-medium"
              title="Download Comparison"
            >
              <DownloadIcon />
              Download
            </button>
          </div>
        )}
      </div>

      {activeImage.error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4">
          Generation failed: {activeImage.error}
        </div>
      )}

      {/* Preview Container: Use aspect-video for single, flexible height for split to fit images better */}
      <div className={`relative w-full ${viewMode === 'split' ? 'h-[60vh] md:h-[600px]' : 'aspect-video'} bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300`}>
        
        {activeImage.isGenerating ? (
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 animate-pulse">Designing this room...</p>
          </div>
        ) : (
          <div className="relative w-full h-full">
             
             {/* Single View: Original */}
             {viewMode === 'original' && (
                <div className="w-full h-full relative">
                  <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain" />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">Original Photo</div>
                </div>
             )}
             
             {/* Single View: Generated */}
             {viewMode === 'generated' && activeImage.generatedUrl && (
                <div className="w-full h-full relative">
                   <img src={activeImage.generatedUrl} alt="Generated" className="w-full h-full object-contain" />
                   <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">AI Redesign</div>
                </div>
             )}

             {/* Split View */}
             {viewMode === 'split' && activeImage.generatedUrl && (
               <div className="flex w-full h-full gap-0.5 md:gap-1">
                  <div className="relative w-1/2 h-full bg-slate-900/50">
                      <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain" />
                      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">Original</div>
                  </div>
                  <div className="relative w-1/2 h-full bg-slate-900/50">
                      <img src={activeImage.generatedUrl} alt="Generated" className="w-full h-full object-contain" />
                      <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">AI Redesign</div>
                  </div>
               </div>
             )}

             {/* Fallback if view is generated/split but no result exists (e.g. error or cleared) */}
             {(viewMode !== 'original' && !activeImage.generatedUrl) && (
                <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain opacity-50" />
             )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PreviewArea;
