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
  "Luz natural brilhante",
  "Ambiente aconchegante e acolhedor",
  "Piso de mármore luxuoso",
  "Tetos altos",
  "Cheio de plantas",
  "Decoração minimalista"
];

const DesignStudio: React.FC<DesignStudioProps> = ({
  generationMode,
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
      {/* Style Selector - Hidden for Paint Only */}
      {generationMode !== GenerationMode.PAINT_ONLY && (
        <div className="animate-fade-in">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">Estilo Arquitetônico</label>
          <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
        </div>
      )}

      {/* Custom Prompt */}
      <div>
        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          {generationMode === GenerationMode.PAINT_ONLY ? 'Cor e Textura da Parede' : 'Instruções Personalizadas'}
        </label>
        <div className="relative group">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={generationMode === GenerationMode.PAINT_ONLY ? "Ex: Azul marinho fosco, Bege areia, Textura de cimento queimado..." : "Descreva detalhes específicos (ex: 'Pintar as paredes de verde sálvia, adicionar uma poltrona de couro...')"}
            className="w-full bg-surface-dark/50 border border-glass-border rounded-xl p-3 text-sm text-text-main placeholder-text-muted/60 focus:ring-2 focus:ring-primary/30 focus:border-primary/20 outline-none transition-all resize-none h-20 group-hover:border-text-muted/40"
          />
          <div className="absolute bottom-2 right-3 text-xs text-text-muted/60 pointer-events-none">
            {customPrompt.length} caracs
          </div>
        </div>

        {/* Quick Suggestions - Filter for Paint Only? Or just hide? */}
        {generationMode !== GenerationMode.PAINT_ONLY && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleAddPrompt(suggestion)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200
                  ${customPrompt.includes(suggestion)
                    ? 'bg-primary/15 border border-primary/30 text-primary'
                    : 'bg-surface/50 border border-glass-border text-text-muted hover:text-white hover:border-text-muted/60 hover:bg-surface/80'
                  }
                `}
              >
                + {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DesignStudio);
