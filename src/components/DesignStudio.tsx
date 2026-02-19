import React from 'react';
import StyleSelector from './StyleSelector';
import { RefreshIcon, MagicWandIcon } from './Icons';
import { ArchitecturalStyle, GenerationMode } from '../types';

interface DesignStudioProps {
  isGenerating: boolean;
  hasImages: boolean;
  handleGenerateAll: () => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  selectedStyle: ArchitecturalStyle | null;
  setSelectedStyle: (style: ArchitecturalStyle | null) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
}

const DesignStudio: React.FC<DesignStudioProps> = ({
  isGenerating,
  hasImages,
  handleGenerateAll,
  generationMode,
  setGenerationMode,
  selectedStyle,
  setSelectedStyle,
  customPrompt,
  setCustomPrompt
}) => {
  return (
    <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Design Studio</h2>
          <p className="text-slate-400">Apply one style to all uploaded photos.</p>
        </div>
        {/* Action Button */}
        <button 
          onClick={handleGenerateAll}
          disabled={isGenerating || !hasImages}
          className={`
            px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all whitespace-nowrap
            ${isGenerating || !hasImages
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:translate-y-0'
            }
          `}
        >
          {isGenerating ? (
            <>
              <RefreshIcon className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <MagicWandIcon />
              Generate Designs
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Mode</label>
          <div className="flex bg-slate-800 p-1 rounded-lg w-fit">
            {Object.values(GenerationMode).map((mode) => (
              <button
                key={mode}
                onClick={() => setGenerationMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  generationMode === mode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Architectural Style</label>
          <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Custom Instructions (Optional)</label>
          <div className="relative">
            <textarea 
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., Paint the walls sage green, add a leather armchair..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none h-20"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DesignStudio;
