import React, { useState, useRef, useCallback } from 'react';
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

/** Inline mobile comparison slider for before/after */
const MobileComparisonSlider: React.FC<{ originalUrl: string; generatedUrl: string }> = ({ originalUrl, generatedUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="relative w-full h-full bg-surface-dark overflow-hidden select-none">
      {/* Generated (full, behind) */}
      <img src={generatedUrl} alt="Generated design" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

      {/* Original (clipped) */}
      <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <img src={originalUrl} alt="Original photo" className="w-full h-full object-contain" />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center border-2 border-white/50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 6l-4 6 4 6" />
            <path d="M16 6l4 6-4 6" />
          </svg>
        </div>
      </div>

      {/* Invisible Range Input */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
        aria-label="Controle de comparação"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderPosition}
      />

      {/* Labels */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-sm border border-white/10 shadow-lg pointer-events-none z-10 uppercase tracking-wider">
        Antes
      </div>
      <div className="absolute bottom-3 right-3 bg-secondary/80 backdrop-blur-md text-black text-xs font-bold px-2.5 py-1 rounded-sm border border-secondary-light/20 shadow-lg pointer-events-none z-10 uppercase tracking-wider">
        Depois
      </div>
    </div>
  );
};

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
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'compare'>('generated');
  const [showPrompt, setShowPrompt] = useState(false);

  // Touch swipe state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // Auto-switch to generated view when generation completes
  React.useEffect(() => {
    if (activeImage.generatedUrl) {
      setViewMode('compare');
    } else {
      setViewMode('original');
    }
  }, [activeImage.generatedUrl]);

  // Swipe handlers for cycling between views
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!activeImage.generatedUrl) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger horizontal swipe if it's clearly horizontal (not scrolling)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const views: Array<'original' | 'compare' | 'generated'> = ['original', 'compare', 'generated'];
      const currentIdx = views.indexOf(viewMode as any);

      if (deltaX < 0 && currentIdx < views.length - 1) {
        // Swipe left → next view
        setViewMode(views[currentIdx + 1]);
      } else if (deltaX > 0 && currentIdx > 0) {
        // Swipe right → previous view
        setViewMode(views[currentIdx - 1]);
      }
    }
  }, [activeImage.generatedUrl, viewMode]);

  const currentImageUrl = viewMode === 'generated' && activeImage.generatedUrl
    ? activeImage.generatedUrl
    : activeImage.previewUrl;

  return (
    <div className="fixed inset-0 z-50 bg-surface-dark flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-dark/80 backdrop-blur-xl border-b border-glass-border shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-text-muted hover:text-white rounded-lg hover:bg-surface/50 transition-all focus-visible:ring-2 focus-visible:ring-secondary"
          aria-label="Voltar para a galeria"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-bold text-text-main text-sm uppercase tracking-wider font-heading">Estúdio de Design</span>
        {/* Swipe hint for when generated */}
        {activeImage.generatedUrl && (
          <span className="text-[10px] text-text-muted animate-fade-in uppercase tracking-widest">← deslizar →</span>
        )}
        {!activeImage.generatedUrl && <div className="w-8" />}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Image Preview Area with swipe */}
        <div
          className="relative aspect-video w-full bg-surface/80 overflow-hidden shadow-lg"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Compare mode with slider */}
          {viewMode === 'compare' && activeImage.generatedUrl ? (
            <MobileComparisonSlider
              originalUrl={activeImage.previewUrl}
              generatedUrl={activeImage.generatedUrl}
            />
          ) : (
            <img
              src={currentImageUrl}
              alt="Preview"
              className="w-full h-full object-contain transition-opacity duration-300"
            />
          )}

          {/* View Mode Tabs */}
          {activeImage.generatedUrl && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex bg-surface/80 backdrop-blur-xl rounded-full p-1 border border-glass-border shadow-xl z-30">
              {([
                { key: 'original' as const, label: 'Original' },
                { key: 'compare' as const, label: 'Comparar' },
                { key: 'generated' as const, label: 'Resultado' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setViewMode(opt.key)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 uppercase tracking-wider ${viewMode === opt.key
                    ? opt.key === 'original'
                      ? 'bg-surface-light text-white'
                      : 'bg-secondary text-black shadow-lg shadow-secondary/30'
                    : 'text-text-muted'
                    }`}
                  aria-label={`Ver ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {isGenerating && (
            <div className="absolute inset-0 bg-surface-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-40">
              <RefreshIcon className="animate-spin text-secondary w-10 h-10" />
              <p className="text-secondary-light font-medium text-sm animate-pulse uppercase tracking-wide">Desenhando seu espaço...</p>
              <p className="text-text-muted text-xs">Geralmente leva de 15 a 30 segundos</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 pt-5 space-y-5">
          {/* Mode Selector */}
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">Modo</label>
            <div className="flex bg-surface/60 p-1 rounded-sm border border-glass-border overflow-x-auto">
              {Object.values(GenerationMode).map(mode => {
                let label = '🎨 Redesign';
                if (mode === GenerationMode.VIRTUAL_STAGING) label = '🪑 Mobiliar';
                if (mode === GenerationMode.PAINT_ONLY) label = '🖌️ Pintura';
                
                return (
                  <button
                    key={mode}
                    onClick={() => setGenerationMode(mode)}
                    className={`flex-1 min-w-[80px] py-2.5 text-xs font-medium rounded-sm transition-all duration-300 uppercase tracking-wide whitespace-nowrap ${generationMode === mode
                      ? 'bg-surface-light text-white shadow-sm ring-1 ring-white/10'
                      : 'text-text-muted'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style Selector - Hidden for Paint Only */}
          {generationMode !== GenerationMode.PAINT_ONLY && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Estilo</label>
                {selectedStyle && (
                  <span className="text-[10px] text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded-sm border border-secondary/20 uppercase tracking-wide">{selectedStyle}</span>
                )}
              </div>
              <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
            </div>
          )}

          {/* Custom Prompt Accordion - Always visible for Paint Only */}
          <div className="border border-glass-border rounded-sm overflow-hidden bg-surface/40">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="w-full flex items-center justify-between p-4 text-left focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset"
              aria-expanded={showPrompt || generationMode === GenerationMode.PAINT_ONLY}
            >
              <span className="text-xs font-bold text-text-main uppercase tracking-wide">
                {generationMode === GenerationMode.PAINT_ONLY ? 'Cor / Textura da Parede' : 'Instruções Adicionais'}
              </span>
              <ChevronDownIcon className={`transition-transform duration-300 text-text-muted ${showPrompt || generationMode === GenerationMode.PAINT_ONLY ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${showPrompt || generationMode === GenerationMode.PAINT_ONLY ? 'max-h-48' : 'max-h-0'}`}>
              <div className="p-4 pt-0">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={generationMode === GenerationMode.PAINT_ONLY ? "Ex: Azul marinho fosco, Bege areia, Textura de cimento queimado..." : "ex. Adicionar sofá de couro, paredes azuis..."}
                  className="input-field h-24 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar — with safe area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-dark/80 backdrop-blur-2xl border-t border-glass-border z-50" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2">
          {/* Regenerate button (shown when image already has a result) */}
          {activeImage.generatedUrl && !isGenerating && (
            <button
              onClick={() => onRegenerateSingle(activeImage.id)}
              className="py-3.5 px-5 rounded-sm font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-[0.98] bg-surface-light text-text-muted border border-glass-border hover:bg-surface hover:text-white focus-visible:ring-2 focus-visible:ring-secondary uppercase tracking-wide"
              aria-label="Gerar design novamente"
            >
              <RefreshIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Refazer</span>
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating || (generationMode !== GenerationMode.PAINT_ONLY && !selectedStyle)}
            className={`
              flex-1 py-3.5 rounded-sm font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all transform active:scale-[0.98] relative overflow-hidden group uppercase tracking-wider font-heading
              ${isGenerating || (generationMode !== GenerationMode.PAINT_ONLY && !selectedStyle)
                ? 'bg-surface/60 text-text-muted cursor-not-allowed border border-glass-border'
                : 'bg-gradient-to-r from-secondary to-secondary-light text-black shadow-secondary/25 hover:from-secondary-dark hover:to-secondary'
              }
            `}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isGenerating ? (
                <>
                  <RefreshIcon className="animate-spin w-4 h-4" />
                  Gerando...
                </>
              ) : (
                <>
                  <MagicWandIcon className="w-4 h-4" />
                  Gerar Design
                </>
              )}
            </span>
            {!isGenerating && selectedStyle && (
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileEditor;
