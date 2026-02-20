import React from 'react';
import StyleSelector from './StyleSelector';
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

const PROMPT_SUGGESTIONS = [
  "Bright natural light",
  "Warm cozy atmosphere",
  "Luxurious marble floors",
  "High ceilings",
  "Plant-filled",
  "Minimalist decor"
];

const DesignStudio: React.FC<DesignStudioProps> = ({
  selectedStyle,
  setSelectedStyle,
  customPrompt,
  setCustomPrompt
}) => {
  const handleAddPrompt = (suggestion: string) => {
    if (customPrompt.includes(suggestion)) return;
    const newPrompt = customPrompt ? `${customPrompt}, ${suggestion}` : suggestion;
    setCustomPrompt(newPrompt);
  };

  return (
    <div className="space-y-4">
      {/* Style Selector */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5">Architectural Style</label>
        <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
      </div>

      {/* Custom Prompt */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Custom Instructions</label>
        <div className="relative group">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe specific details (e.g., 'Paint the walls sage green, add a leather armchair...')"
            className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/20 outline-none transition-all resize-none h-20 group-hover:border-zinc-700/60"
          />
          <div className="absolute bottom-2 right-3 text-xs text-zinc-600 pointer-events-none">
            {customPrompt.length} chars
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleAddPrompt(suggestion)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200
                ${customPrompt.includes(suggestion)
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-800/50 border border-zinc-700/40 text-zinc-400 hover:text-white hover:border-zinc-600/60 hover:bg-zinc-700/50'
                }
              `}
            >
              + {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DesignStudio);
