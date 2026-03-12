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
  "Mobiliar como sala de estar contemporânea com sofá leve, tapete amplo e mesa de centro discreta",
  "Transformar em quarto principal minimalista com cama queen, criados e iluminação suave",
  "Completar o home office sem trocar os móveis existentes",
  "Staging leve para anúncio imobiliário, sem excesso de decoração",
  "Adicionar mesa de jantar compacta para 4 pessoas, mantendo boa circulação",
  "Ambiente aconchegante com poucos objetos e visual premium"
];

const PAINT_PROMPT_SUGGESTIONS = [
  "Pintar todas as paredes de verde sálvia fosco",
  "Criar uma parede de destaque azul marinho atrás do sofá",
  "Pintar somente a parede da TV em bege areia",
  "Aplicar textura de cimento queimado em todas as paredes"
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

  const showStyleSelector = generationMode !== GenerationMode.PAINT_ONLY;

  return (
    <div className={`flex gap-5 ${showStyleSelector ? 'flex-row items-start' : 'flex-col'}`}>
      {/* Style Selector — left column, only when not Paint Only */}
      {showStyleSelector && (
        <div className="animate-fade-in flex-shrink-0 w-[52%]">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Estilo Arquitetônico
          </label>
          <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
        </div>
      )}

      {/* Custom Prompt — right column (or full width for Paint Only) */}
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          {generationMode === GenerationMode.PAINT_ONLY ? 'Cor e Textura da Parede' : 'Instruções Personalizadas'}
        </label>
        <div className="relative group">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={
              generationMode === GenerationMode.PAINT_ONLY
                ? "Ex: Pintar todas as paredes de verde sálvia fosco, criar uma parede de destaque azul marinho atrás do sofá..."
                : "Ex: Mobiliar como sala contemporânea com sofá claro, tapete grande e boa circulação, sem excesso de decoração..."
            }
            className="w-full bg-surface-dark/50 border border-glass-border rounded-xl p-3 text-sm text-text-main placeholder-text-muted/60 focus:ring-2 focus:ring-primary/30 focus:border-primary/20 outline-none transition-all resize-none h-[88px] group-hover:border-text-muted/40"
          />
          <div className="absolute bottom-2 right-3 text-xs text-text-muted/60 pointer-events-none">
            {customPrompt.length} caracs
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(generationMode === GenerationMode.PAINT_ONLY ? PAINT_PROMPT_SUGGESTIONS : PROMPT_SUGGESTIONS).map((suggestion) => (
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
        {generationMode === GenerationMode.PAINT_ONLY && (
          <p className="mt-2 text-[11px] text-text-muted/70 leading-relaxed">
            Seja específico: diga se quer <strong>todas as paredes</strong>, <strong>uma parede de destaque</strong> ou <strong>somente uma parede específica</strong>.
          </p>
        )}
        {generationMode !== GenerationMode.PAINT_ONLY && (
          <p className="mt-2 text-[11px] text-text-muted/70 leading-relaxed">
            Peça o uso do ambiente, nível de decoração e restrições como <strong>boa circulação</strong>, <strong>staging leve</strong> ou <strong>preservar móveis existentes</strong>.
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(DesignStudio);
