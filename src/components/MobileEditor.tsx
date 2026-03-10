import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadedImage, ArchitecturalStyle, GenerationMode } from '../types';
import StyleSelector from './StyleSelector';
import { RefreshIcon, MagicWandIcon, ChevronDownIcon } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import DownloadMenu from './DownloadMenu';

interface MobileEditorProps {
  activeImage: UploadedImage;
  onBack: () => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onRegenerateSingle: (imageId: string) => void;
  onIterateOnGenerated: (imageId: string) => void;
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;
  selectedStyle: ArchitecturalStyle | null;
  setSelectedStyle: (style: ArchitecturalStyle | null) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  imageIndex: number;
  totalImages: number;
  onNext: () => void;
  onPrev: () => void;
  hasGeneratedImages: boolean;
  isDownloadingZip: boolean;
  onDownloadSingle: (url: string, name: string) => void;
  onDownloadComparison: (originalUrl: string, generatedUrl: string) => void;
  onDownloadAll: () => void;
  onDownloadVideo: (url: string) => void;
  onSharePresentation: () => void;
}

const MobileComparisonSlider: React.FC<{ originalUrl: string; generatedUrl: string }> = ({ originalUrl, generatedUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
    if (navigator.vibrate) {
      // Micro haptic feedback on significant points
      if (Math.abs(Number(e.target.value) - 50) < 2) navigator.vibrate(5);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-surface-dark overflow-hidden select-none">
      <img src={generatedUrl || undefined} alt="Generated design" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

      <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <img src={originalUrl || undefined} alt="Original photo" className="w-full h-full object-contain" />
      </div>

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-9 sm:h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center border-2 border-white/50">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 6l-4 6 4 6" />
            <path d="M16 6l4 6-4 6" />
          </svg>
        </div>
      </div>

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
  onIterateOnGenerated,
  generationMode,
  setGenerationMode,
  selectedStyle,
  setSelectedStyle,
  customPrompt,
  setCustomPrompt,
  imageIndex,
  totalImages,
  onNext,
  onPrev,
  hasGeneratedImages,
  isDownloadingZip,
  onDownloadSingle,
  onDownloadComparison,
  onDownloadAll,
  onDownloadVideo,
  onSharePresentation
}) => {
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'compare'>('generated');
  const [showPrompt, setShowPrompt] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    if (activeImage.generatedUrl) {
      setViewMode('compare');
    } else {
      setViewMode('original');
    }
  }, [activeImage.generatedUrl]);

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
        setViewMode(views[currentIdx + 1]);
        if (navigator.vibrate) navigator.vibrate(10);
      } else if (deltaX > 0 && currentIdx > 0) {
        setViewMode(views[currentIdx - 1]);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  }, [activeImage.generatedUrl, viewMode]);

  const currentImageUrl = viewMode === 'generated' && activeImage.generatedUrl
    ? activeImage.generatedUrl
    : activeImage.previewUrl;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-surface-dark flex flex-col h-full overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] bg-surface-dark/80 backdrop-blur-xl border-b border-glass-border shrink-0 relative z-20">
        <button
          onClick={onBack}
          className="p-3 -ml-3 text-text-muted hover:text-white rounded-lg hover:bg-surface/50 transition-all focus-visible:ring-2 focus-visible:ring-secondary"
          aria-label="Voltar para a galeria"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-bold text-text-main text-sm uppercase tracking-wider font-heading truncate">Estúdio de Design</span>
        {/* Swipe hint for when generated */}
        {activeImage.generatedUrl && (
          <span className="hidden sm:inline-block absolute top-12 left-1/2 -translate-x-1/2 text-[10px] text-text-muted animate-fade-in uppercase tracking-widest bg-surface-dark/90 px-2 py-0.5 rounded-full z-10">← deslizar →</span>
        )}

        <div className="flex items-center gap-1 -mr-3">
          {hasGeneratedImages && (
            <button
              onClick={onSharePresentation}
              className="p-3 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-surface/50 transition-all shrink-0"
              title="Gerar PDF"
              aria-label="Gerar PDF"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </button>
          )}

          {activeImage.generatedUrl && (
            <div className="shrink-0">
              <DownloadMenu
                activeImage={activeImage}
                imageIndex={imageIndex}
                hasGeneratedImages={hasGeneratedImages}
                isDownloadingZip={isDownloadingZip}
                onDownloadSingle={onDownloadSingle}
                onDownloadComparison={onDownloadComparison}
                onDownloadAll={onDownloadAll}
                onDownloadVideo={onDownloadVideo}
              />
            </div>
          )}

          {!activeImage.generatedUrl && !hasGeneratedImages && <div className="w-8" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div
          className="relative aspect-video w-full bg-surface/80 overflow-hidden shadow-lg"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === 'compare' && activeImage.generatedUrl ? (
            <MobileComparisonSlider
              originalUrl={activeImage.previewUrl}
              generatedUrl={activeImage.generatedUrl}
            />
          ) : (
            <AnimatePresence mode='wait'>
              <motion.img
                key={currentImageUrl}
                src={currentImageUrl || undefined}
                alt="Preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-contain"
              />
            </AnimatePresence>
          )}

          {isGenerating && (
            <div className="absolute inset-0 bg-surface-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-40">
              <RefreshIcon className="animate-spin text-secondary w-10 h-10" />
              <p className="text-secondary-light font-medium text-sm animate-pulse uppercase tracking-wide">Desenhando seu espaço...</p>
              <p className="text-text-muted text-xs">Geralmente leva de 15 a 30 segundos</p>
            </div>
          )}

          {totalImages > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate(10);
                onPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 flex justify-center items-center rounded-full bg-black/40 text-white backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/20 hover:bg-black/60 transition-all active:scale-90"
              aria-label="Imagem anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}

          {totalImages > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate(10);
                onNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 flex justify-center items-center rounded-full bg-black/40 text-white backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/20 hover:bg-black/60 transition-all active:scale-90"
              aria-label="Próxima imagem"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}
        </div>

        {activeImage.generatedUrl && (
          <div className="px-4 mt-4 flex justify-center">
            <div className="flex bg-surface-dark/90 backdrop-blur-xl rounded-full p-1 border border-glass-border shadow-xl w-full max-w-[320px]">
              {([
                { key: 'original' as const, label: 'Original' },
                { key: 'compare' as const, label: 'Comparar' },
                { key: 'generated' as const, label: 'Resultado' },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setViewMode(opt.key)}
                  className={`flex-1 py-2 sm:py-1.5 rounded-full text-[10px] items-center justify-center font-bold transition-all duration-300 uppercase tracking-wider ${viewMode === opt.key
                    ? opt.key === 'original'
                      ? 'bg-surface-light text-white'
                      : 'bg-secondary text-black shadow-lg shadow-secondary/30'
                    : 'text-text-muted hover:text-white'
                    }`}
                  aria-label={`Ver ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`px-4 ${activeImage.generatedUrl ? 'pt-4' : 'pt-5'} space-y-4`}>
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">Modo</label>
            <div className="flex gap-2 bg-surface/60 p-1 rounded-sm border border-glass-border overflow-x-auto snap-x custom-scrollbar-hide">
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

          <div className="border border-glass-border rounded-sm overflow-hidden bg-surface/40">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="w-full flex items-center justify-between p-4 min-h-[56px] text-left focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset"
              aria-expanded={showPrompt || generationMode === GenerationMode.PAINT_ONLY}
            >
              <span className="text-xs font-bold text-text-main uppercase tracking-wide">
                {generationMode === GenerationMode.PAINT_ONLY ? 'Cor / Textura da Parede' : 'Instruções Adicionais'}
              </span>
              <ChevronDownIcon className={`transition-transform duration-300 text-text-muted w-5 h-5 ${showPrompt || generationMode === GenerationMode.PAINT_ONLY ? 'rotate-180' : ''}`} />
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

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-surface-dark/80 backdrop-blur-2xl border-t border-glass-border z-50"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col gap-2.5">
          {activeImage.generatedUrl && !isGenerating && (
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onIterateOnGenerated(activeImage.id);
              }}
              className={`w-full py-3.5 px-5 rounded-sm font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-[0.98] uppercase tracking-wide ${activeImage.iterateFromGenerated
                ? 'bg-primary text-white border border-primary/50 ring-2 ring-primary/30'
                : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border border-violet-500/30 shadow-violet-500/20'
                }`}
              aria-label="Continuar editando — a próxima geração usará este resultado como base"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="16" height="16" rx="2" ry="2" opacity="0.4" />
                <rect x="6" y="3" width="16" height="16" rx="2" ry="2" />
              </svg>
              <span>{activeImage.iterateFromGenerated ? '✓ Editando resultado' : 'Continuar Editando'}</span>
            </button>
          )}

          <div className="flex gap-2 w-full">
            {activeImage.generatedUrl && !isGenerating && (
              <button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  onRegenerateSingle(activeImage.id);
                }}
                className="flex-1 sm:flex-none py-3.5 px-4 sm:px-5 rounded-sm font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-[0.98] bg-surface-light text-text-muted border border-glass-border hover:bg-surface hover:text-white focus-visible:ring-2 focus-visible:ring-secondary uppercase tracking-wide"
                aria-label="Gerar design novamente"
              >
                <RefreshIcon className="w-4 h-4" />
                <span>Refazer</span>
              </button>
            )}
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onGenerate();
              }}
              disabled={isGenerating || (generationMode !== GenerationMode.PAINT_ONLY && !selectedStyle)}
              className={`
                flex-[2] py-3.5 rounded-sm font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all transform active:scale-[0.98] relative overflow-hidden group uppercase tracking-wider font-heading
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
      </motion.div>
    </motion.div>
  );
};

export default MobileEditor;
