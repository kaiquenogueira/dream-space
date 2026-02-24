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
  hasGeneratedImages: boolean;
  isDownloadingZip: boolean;
  onNext: () => void;
  onPrev: () => void;
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
  hasGeneratedImages,
  isDownloadingZip,
  onNext,
  onPrev
}) => {
  const [zoom, setZoom] = useState(1);
  const [isGeneratingTour, setIsGeneratingTour] = useState(false);
  const [tourImageUrl, setTourImageUrl] = useState<string | null>(null);
  const [tourVideoOpName, setTourVideoOpName] = useState<string | undefined>(undefined);

  const handleCreateTour = async () => {
    const targetUrl = activeImage?.generatedUrl || activeImage?.previewUrl;
    if (!targetUrl) return;

    // If video already exists, just show it
    if (activeImage?.videoUrl) {
      setTourImageUrl(targetUrl);
      return;
    }

    setIsGeneratingTour(true);
    try {
      const { videoOperationName } = await generateDroneTourScript(targetUrl, true);
      setTourImageUrl(targetUrl);
      setTourVideoOpName(videoOperationName);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar o Drone Tour');
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

        <div className="flex items-center gap-2.5">
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

          {/* Drone Tour Button */}
          {activeImage.generatedUrl && (
            <button
              onClick={handleCreateTour}
              disabled={isGeneratingTour}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all shadow-lg text-xs font-bold uppercase tracking-wide ${isGeneratingTour ? 'bg-surface text-text-muted cursor-not-allowed' : 'bg-gradient-to-r from-secondary to-secondary-dark hover:from-secondary-light hover:to-secondary text-black shadow-secondary/20 hover:-translate-y-0.5'}`}
              title="Cinematic Drone Tour (2 Créditos)"
            >
              {isGeneratingTour ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-text-muted/30 border-t-text-muted animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              )}
              <span className="hidden sm:inline">{isGeneratingTour ? 'Criando...' : (activeImage.videoUrl ? 'Ver Drone Tour' : 'Drone Tour')}</span>
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
                  <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain" />
                  {zoom === 1 && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-lg z-20">Foto Original</div>
                  )}
                </div>
              )}

              {/* Generated View */}
              {effectiveViewMode === 'generated' && activeImage.generatedUrl && (
                <div className="w-full h-full relative animate-fade-in">
                  <img src={activeImage.generatedUrl} alt="Generated" className="w-full h-full object-contain" />
                  {zoom === 1 && (
                    <div className="absolute bottom-4 left-4 bg-primary-dark/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg border border-primary/20 z-20">Design com IA</div>
                  )}
                </div>
              )}

              {/* Split View with Interactive Slider */}
              {effectiveViewMode === 'split' && activeImage.generatedUrl && (
                <ComparisonSlider
                  originalUrl={activeImage.previewUrl}
                  generatedUrl={activeImage.generatedUrl}
                />
              )}
            </div>
          </>
        )}
      </div>
      {tourImageUrl && (tourVideoOpName || activeImage?.videoUrl) && (
        <DroneTourPlayer
          imageUrl={tourImageUrl}
          videoOperationName={tourVideoOpName}
          initialVideoUrl={activeImage?.videoUrl}
          onVideoGenerated={onVideoGenerated}
          onClose={() => {
            setTourImageUrl(null);
            setTourVideoOpName(undefined);
          }}
        />
      )}
    </section>
  );
};

export default PreviewArea;
