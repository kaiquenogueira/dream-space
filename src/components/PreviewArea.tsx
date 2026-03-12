import React, { useState, useEffect } from 'react';
import { ColumnsIcon, ArrowLeftIcon, ArrowRightIcon, ImageIcon, EyeIcon } from './Icons';
import { UploadedImage } from '../types';
import DroneTourPlayer from './DroneTourPlayer';
import ComparisonSlider from './ComparisonSlider';
import ZoomControls from './ZoomControls';
import DownloadMenu from './DownloadMenu';
import { generateDroneTourScript } from '../services/geminiService';
import { UI_CONSTANTS } from '../constants';

interface PreviewAreaProps {
  activeImage: UploadedImage | undefined;
  imageIndex: number;
  totalImages: number;
  viewMode: 'original' | 'generated' | 'split';
  setViewMode: (mode: 'original' | 'generated' | 'split') => void;
  handleDownloadComparison: (originalUrl: string, generatedUrl: string) => void;
  handleDownloadSingle: (url: string, name: string, extension?: string) => void;
  handleDownloadAll: () => void;
  onVideoGenerated: (url: string) => void;
  onIterateOnGenerated: (imageId: string) => void;
  hasGeneratedImages: boolean;
  isDownloadingZip: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSharePresentation: () => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({
  activeImage,
  imageIndex,
  totalImages,
  viewMode,
  setViewMode,
  handleDownloadComparison,
  handleDownloadSingle,
  handleDownloadAll,
  onVideoGenerated,
  onIterateOnGenerated,
  hasGeneratedImages,
  isDownloadingZip,
  onNext,
  onPrev,
  onSharePresentation
}) => {
  const [zoom, setZoom] = useState(1);
  const [isGeneratingTour, setIsGeneratingTour] = useState(false);
  const [tourImageUrl, setTourImageUrl] = useState<string | null>(null);
  const [tourVideoOpName, setTourVideoOpName] = useState<string | undefined>(undefined);
  const [showTourModal, setShowTourModal] = useState(false);
  const [tourPrompt, setTourPrompt] = useState('');

  const handleOpenTourModal = () => {
    setShowTourModal(true);
    setTourPrompt('');
  };

  const handleCreateTour = async () => {
    const targetUrl = activeImage?.generatedUrl || activeImage?.previewUrl;
    if (!targetUrl) return;

    // If video already exists, just show it
    if (activeImage?.videoUrl) {
      setTourImageUrl(targetUrl);
      return;
    }

    setIsGeneratingTour(true);
    setShowTourModal(false); // Close modal

    try {
      const { videoOperationName } = await generateDroneTourScript(targetUrl, true, tourPrompt);
      setTourImageUrl(targetUrl);
      setTourVideoOpName(videoOperationName);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar o Drone Tour';
      alert(message);
    } finally {
      setIsGeneratingTour(false);
    }
  };

  // Reset zoom when image changes or view mode changes
  useEffect(() => {
    setZoom(1);
  }, [activeImage?.id, viewMode]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + UI_CONSTANTS.ZOOM_STEP, UI_CONSTANTS.MAX_ZOOM));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - UI_CONSTANTS.ZOOM_STEP, UI_CONSTANTS.MIN_ZOOM));
  const handleResetZoom = () => setZoom(1);

  if (!activeImage) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-glass-border rounded-2xl bg-surface/30 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface/50 flex items-center justify-center mb-4 animate-float">
          <ImageIcon className="w-7 h-7 text-text-muted" />
        </div>
        <p className="text-base font-medium text-text-muted">Faça upload de fotos para começar a desenhar</p>
        <p className="text-sm text-text-muted mt-1">Selecione imagens na barra lateral</p>
      </div>
    );
  }

  const VIEW_OPTIONS = [
    { key: 'original' as const, label: 'Original', disabled: false },
    { key: 'generated' as const, label: 'Resultado', disabled: !activeImage.generatedUrl && !activeImage.isGenerating },
    { key: 'split' as const, label: 'Comparar', icon: <ColumnsIcon className="w-3.5 h-3.5" />, disabled: !activeImage.generatedUrl && !activeImage.isGenerating },
  ];

  const effectiveViewMode = (!activeImage.generatedUrl && !activeImage.isGenerating) ? 'original' : viewMode;

  return (
    <section className="glass-card p-4 md:p-5 overflow-hidden flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/10">
            <EyeIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              Visualização
              <span className="text-text-muted text-xs font-medium px-2 py-0.5 bg-surface/50 rounded-md">
                {imageIndex + 1} / {totalImages}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
          {/* Navigation */}
          {totalImages > 1 && (
            <div className="flex items-center gap-1 bg-surface-dark/50 p-1 rounded-xl border border-glass-border">
              <button
                onClick={onPrev}
                className="p-1.5 text-text-muted hover:text-white hover:bg-surface/60 rounded-lg transition-all"
                title="Imagem Anterior"
                aria-label="Imagem Anterior"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                className="p-1.5 text-text-muted hover:text-white hover:bg-surface/60 rounded-lg transition-all"
                title="Próxima Imagem"
                aria-label="Próxima Imagem"
              >
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Mode */}
          <div className="flex items-center bg-surface-dark/50 p-1 rounded-xl border border-glass-border">
            {VIEW_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setViewMode(opt.key)}
                disabled={opt.disabled}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${viewMode === opt.key
                  ? (opt.key === 'original' ? 'bg-surface/80 text-white shadow-sm ring-1 ring-white/10' : 'bg-primary-dark text-white shadow-sm shadow-primary-dark/20')
                  : 'text-text-muted hover:text-white hover:bg-surface/40'
                  }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refine Button */}
          {activeImage.generatedUrl && (
            <button
              onClick={() => onIterateOnGenerated(activeImage.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${activeImage.iterateFromGenerated
                ? 'bg-secondary/10 border-secondary/40 text-secondary'
                : 'bg-surface/60 border-glass-border text-text-muted hover:text-white hover:border-secondary/40 hover:bg-surface/80'
                }`}
              title="Refinar resultado — a próxima geração usará esta imagem como base"
            >
              {activeImage.iterateFromGenerated ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Refinando</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span>Refinar</span>
                </>
              )}
            </button>
          )}

          {/* Drone Tour Button */}
          {activeImage.generatedUrl && (
            <button
              onClick={() => {
                if (activeImage.videoUrl) {
                  setTourImageUrl(activeImage.generatedUrl || activeImage.previewUrl);
                } else {
                  handleOpenTourModal();
                }
              }}
              disabled={isGeneratingTour}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide transition-all duration-200 border ${isGeneratingTour
                ? 'bg-surface/40 border-glass-border text-text-muted/50 cursor-not-allowed'
                : 'bg-surface/60 border-secondary/25 text-secondary/70 hover:text-secondary hover:border-secondary/50 hover:bg-surface/80'
                }`}
              title="Cinematic Drone Tour (50 Créditos)"
            >
              {isGeneratingTour ? (
                <div className="w-3 h-3 rounded-full border-2 border-text-muted/30 border-t-text-muted animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
              <span>{isGeneratingTour ? 'Criando...' : (activeImage.videoUrl ? 'Ver Tour' : 'Drone Tour')}</span>
            </button>
          )}

          {/* Share Presentation Button */}
          {hasGeneratedImages && (
            <button
              onClick={onSharePresentation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/60 border border-glass-border text-text-muted hover:text-white hover:border-secondary/40 hover:bg-surface/80 rounded-sm transition-all duration-200 text-xs font-bold uppercase tracking-wide"
              title="Criar PDF com sua marca"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Gerar PDF</span>
            </button>
          )}

          {/* Download Menu */}
          <DownloadMenu
            activeImage={activeImage}
            imageIndex={imageIndex}
            hasGeneratedImages={hasGeneratedImages}
            isDownloadingZip={isDownloadingZip}
            onDownloadSingle={handleDownloadSingle}
            onDownloadComparison={handleDownloadComparison}
            onDownloadAll={handleDownloadAll}
            onDownloadVideo={(url) => handleDownloadSingle(url, `video-${imageIndex + 1}`, 'mp4')}
          />
        </div>
      </div>

      {/* Error */}
      {activeImage.error && (
        <div className="bg-red-500/10 border border-red-500/15 text-red-300 p-3.5 rounded-xl mb-4 flex items-center gap-3 animate-scale-in flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="text-sm font-medium">Falha na geração: {activeImage.error}</p>
        </div>
      )}

      {/* Preview Container */}
      <div className={`relative flex-1 min-h-0 bg-surface-dark/80 rounded-xl flex items-center justify-center border border-glass-border shadow-inner transition-all duration-500 group ${zoom > 1 ? 'overflow-auto cursor-move' : 'overflow-hidden'}`}>

        {activeImage.isGenerating ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse rounded-full" />
              <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary" style={{ boxShadow: '0 0 20px rgba(59,130,246,0.4)' }} />
            </div>
            <div>
              <p className="text-lg font-medium text-white">Desenhando seu espaço...</p>
              <p className="text-sm text-text-muted mt-1">Isso geralmente leva de 15 a 30 segundos</p>
            </div>
          </div>
        ) : (
          <>
            {/* Zoom Controls */}
            <ZoomControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
            />

            <div
              className="absolute inset-0 transition-transform duration-200 ease-out origin-center"
              style={{
                width: `${zoom * 100}%`,
                height: `${zoom * 100}%`,
                left: `${(1 - zoom) * 50}%`,
                top: `${(1 - zoom) * 50}%`
              }}
            >

              {/* Original View */}
              {effectiveViewMode === 'original' && (
                <div className="w-full h-full relative animate-fade-in">
                  <img src={activeImage.previewUrl || undefined} alt="Original" className="w-full h-full object-contain" />
                  {zoom === 1 && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-lg z-20">Foto Original</div>
                  )}
                </div>
              )}

              {/* Generated View */}
              {effectiveViewMode === 'generated' && activeImage.generatedUrl && (
                <div className="w-full h-full relative animate-fade-in">
                  <img src={activeImage.generatedUrl || undefined} alt="Generated" className="w-full h-full object-contain" />
                  {zoom === 1 && (
                    <div className="absolute bottom-4 left-4 bg-primary-dark/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg border border-primary/20 z-20">Design com IA</div>
                  )}
                </div>
              )}

              {/* Split View with Interactive Slider */}
              {effectiveViewMode === 'split' && activeImage.generatedUrl && (
                <ComparisonSlider
                  key={activeImage.generatedUrl}
                  originalUrl={activeImage.previewUrl}
                  generatedUrl={activeImage.generatedUrl}
                />
              )}
            </div>
          </>
        )}
      </div>
      {/* Drone Tour Modal */}
      {showTourModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 rounded-xl border border-glass-border shadow-2xl animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-2">Cinematic Drone Tour</h3>
            <p className="text-text-muted text-sm mb-4">
              Crie um vídeo cinematográfico do seu ambiente. Personalize o movimento e estilo da câmera abaixo.
              <span className="block mt-1 text-secondary font-medium">Custo: 50 Créditos</span>
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                Instruções de Câmera (Opcional)
              </label>
              <textarea
                value={tourPrompt}
                onChange={(e) => setTourPrompt(e.target.value)}
                placeholder="Ex: Zoom lento em direção à janela, iluminação suave de entardecer..."
                className="w-full bg-surface-dark/50 border border-glass-border rounded-lg p-3 text-sm text-text-main placeholder-text-muted/50 focus:ring-2 focus:ring-secondary/30 focus:border-secondary/30 outline-none transition-all resize-none h-24"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTourModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTour}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-secondary text-black hover:bg-secondary-light transition-all shadow-lg shadow-secondary/20"
              >
                Gerar Vídeo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drone Tour Player */}
      {tourImageUrl && (
        <DroneTourPlayer
          imageUrl={tourImageUrl}
          videoOperationName={tourVideoOpName}
          initialVideoUrl={activeImage.videoUrl}
          onVideoGenerated={(url) => {
            onVideoGenerated(url);
            // Clear operation name to stop polling if we have the URL
            setTourVideoOpName(undefined);
          }}
          onClose={() => setTourImageUrl(null)}
        />
      )}
    </section>
  );
};

export default PreviewArea;
