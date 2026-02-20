import React, { useState } from 'react';
import { UploadedImage, ArchitecturalStyle, GenerationMode } from '../types';
import StyleSelector from './StyleSelector';
import { RefreshIcon, MagicWandIcon, ChevronDownIcon } from './Icons';

interface MobileEditorProps {
  activeImage: UploadedImage;
  onBack: () => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onRegenerateSingle: (imageId: string) => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  selectedStyle: ArchitecturalStyle | null;
  setSelectedStyle: (style: ArchitecturalStyle | null) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
}

const MobileEditor: React.FC<MobileEditorProps> = ({
  activeImage,
  onBack,
  isGenerating,
  onGenerate,
  onRegenerateSingle,
  generationMode,
  setGenerationMode,
  selectedStyle,
  setSelectedStyle,
  customPrompt,
  setCustomPrompt
}) => {
  const [viewMode, setViewMode] = useState<'original' | 'generated'>('generated');
  const [showPrompt, setShowPrompt] = useState(false);

  // Auto-switch to generated view when generation completes
  React.useEffect(() => {
    if (activeImage.generatedUrl) {
      setViewMode('generated');
    } else {
      setViewMode('original');
    }
  }, [activeImage.generatedUrl]);

  const currentImageUrl = viewMode === 'generated' && activeImage.generatedUrl
    ? activeImage.generatedUrl
    : activeImage.previewUrl;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06] shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-semibold text-zinc-200 text-sm">Design Studio</span>
        <div className="w-8" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar">
        {/* Image Preview Area */}
        <div className="relative aspect-video w-full bg-zinc-900/80 overflow-hidden shadow-lg group">
          <img
            src={currentImageUrl}
            alt="Preview"
            className="w-full h-full object-contain transition-opacity duration-300"
          />

          {/* View Toggles */}
          {activeImage.generatedUrl && (
            <div className="absolute bottom-3 left-1/2 -tranzinc-x-1/2 flex bg-zinc-900/80 backdrop-blur-xl rounded-full p-1 border border-white/[0.08] shadow-xl">
              <button
                onClick={() => setViewMode('original')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${viewMode === 'original' ? 'bg-zinc-700/80 text-white' : 'text-zinc-400'}`}
              >
                Original
              </button>
              <button
                onClick={() => setViewMode('generated')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${viewMode === 'generated' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-zinc-400'}`}
              >
                Result
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <RefreshIcon className="animate-spin text-emerald-500 w-10 h-10" />
              <p className="text-emerald-200 font-medium text-sm animate-pulse">Designing...</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 pt-5 space-y-5">
          {/* Mode Selector */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Mode</label>
            <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/40">
              {Object.values(GenerationMode).map(mode => (
                <button
                  key={mode}
                  onClick={() => setGenerationMode(mode)}
                  className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all duration-300 ${generationMode === mode
                    ? 'bg-zinc-800/80 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-zinc-500'
                    }`}
                >
                  {mode === GenerationMode.REDESIGN ? 'Redesign' : 'Furnish'}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Style</label>
              {selectedStyle && (
                <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">{selectedStyle}</span>
              )}
            </div>
            <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
          </div>

          {/* Custom Prompt Accordion */}
          <div className="border border-zinc-800/40 rounded-xl overflow-hidden bg-zinc-900/40">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-medium text-zinc-300">Additional Instructions</span>
              <ChevronDownIcon className={`transition-transform duration-300 text-zinc-500 ${showPrompt ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${showPrompt ? 'max-h-48' : 'max-h-0'}`}>
              <div className="p-4 pt-0">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Add a leather sofa, make walls blue..."
                  className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-emerald-500/30 outline-none h-24 resize-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/80 backdrop-blur-2xl border-t border-white/[0.06] pb-safe z-50">
        <div className="flex gap-2">
          {/* Regenerate button (shown when image already has a result) */}
          {activeImage.generatedUrl && !isGenerating && (
            <button
              onClick={() => onRegenerateSingle(activeImage.id)}
              className="py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-[0.98] bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-700/80 hover:text-white"
            >
              <RefreshIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating || !selectedStyle}
            className={`
              flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all transform active:scale-[0.98] relative overflow-hidden group
              ${isGenerating || !selectedStyle
                ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/25 hover:from-emerald-500 hover:to-teal-500'
              }
            `}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isGenerating ? (
                <>
                  <RefreshIcon className="animate-spin w-4 h-4" />
                  Generating...
                </>
              ) : (
                <>
                  <MagicWandIcon className="w-4 h-4" />
                  Generate Design
                </>
              )}
            </span>
            {!isGenerating && selectedStyle && (
              <div className="absolute inset-0 -tranzinc-x-full group-hover:tranzinc-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileEditor;
