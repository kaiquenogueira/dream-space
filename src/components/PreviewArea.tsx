import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LayoutIcon, DownloadIcon, ColumnsIcon, ArrowLeftIcon, ArrowRightIcon, ImageIcon, EyeIcon, ZoomInIcon, ZoomOutIcon, RefreshIcon } from './Icons';
import { UploadedImage } from '../types';

interface PreviewAreaProps {
  activeImage: UploadedImage | undefined;
  imageIndex: number;
  totalImages: number;
  viewMode: 'original' | 'generated' | 'split';
  setViewMode: (mode: 'original' | 'generated' | 'split') => void;
  handleDownloadComparison: (originalUrl: string, generatedUrl: string) => void;
  handleDownloadSingle: (url: string, name: string) => void;
  handleDownloadAll: () => void;
  hasGeneratedImages: boolean;
  isDownloadingZip: boolean;
  onNext: () => void;
  onPrev: () => void;
}

const ComparisonSlider: React.FC<{ originalUrl: string; generatedUrl: string }> = ({ originalUrl, generatedUrl }) => {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(Number(e.target.value));
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none group">
      {/* Generated (full, behind) */}
      <img src={generatedUrl} alt="Generated" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

      {/* Original (clipped via clip-path — no distortion) */}
      <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <img
          src={originalUrl}
          alt="Original"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Slider Handle Visual */}
        <div className="absolute top-1/2 left-1/2 -tranzinc-x-1/2 -tranzinc-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center border-2 border-white/50 transition-transform group-active:scale-110">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 6l-4 6 4 6" />
            <path d="M16 6l4 6-4 6" />
          </svg>
        </div>
      </div>

      {/* Invisible Range Input for Interaction & A11y */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 focus:outline-none"
        aria-label="Comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderPosition}
      />

      {/* Labels */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-lg pointer-events-none z-10">
        Before
      </div>
      <div className="absolute bottom-4 right-4 bg-emerald-600/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-400/20 shadow-lg pointer-events-none z-10">
        After
      </div>
    </div>
  );
};

const PreviewArea: React.FC<PreviewAreaProps> = ({
  activeImage,
  imageIndex,
  totalImages,
  viewMode,
  setViewMode,
  handleDownloadComparison,
  handleDownloadSingle,
  handleDownloadAll,
  hasGeneratedImages,
  isDownloadingZip,
  onNext,
  onPrev
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Reset zoom when image changes or view mode changes
  useEffect(() => {
    setZoom(1);
  }, [activeImage?.id, viewMode]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const handleResetZoom = () => setZoom(1);

  if (!activeImage) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/30 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4 animate-float">
          <ImageIcon className="w-7 h-7 text-zinc-600" />
        </div>
        <p className="text-base font-medium text-zinc-400">Upload photos to start designing</p>
        <p className="text-sm text-zinc-600 mt-1">Select images from the sidebar</p>
      </div>
    );
  }

  const VIEW_OPTIONS = [
    { key: 'original' as const, label: 'Original', disabled: false },
    { key: 'generated' as const, label: 'Result', disabled: !activeImage.generatedUrl && !activeImage.isGenerating },
    { key: 'split' as const, label: 'Compare', icon: <ColumnsIcon className="w-3.5 h-3.5" />, disabled: !activeImage.generatedUrl && !activeImage.isGenerating },
  ];

  return (
    <section className="glass-card p-4 md:p-5 overflow-hidden flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/10">
            <EyeIcon className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              Preview
              <span className="text-zinc-500 text-[11px] font-medium px-2 py-0.5 bg-zinc-800/50 rounded-md">
                {imageIndex + 1} / {totalImages}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Navigation */}
          {totalImages > 1 && (
            <div className="flex items-center gap-1 bg-zinc-950/50 p-1 rounded-xl border border-zinc-800/40">
              <button
                onClick={onPrev}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-all"
                title="Previous Image"
                aria-label="Previous Image"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-lg transition-all"
                title="Next Image"
                aria-label="Next Image"
              >
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Mode */}
          <div className="flex items-center bg-zinc-950/50 p-1 rounded-xl border border-zinc-800/40">
            {VIEW_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setViewMode(opt.key)}
                disabled={opt.disabled}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed ${viewMode === opt.key
                  ? (opt.key === 'original' ? 'bg-zinc-800/80 text-white shadow-sm ring-1 ring-white/10' : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20')
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                  }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Download Menu */}
          {(activeImage.generatedUrl || hasGeneratedImages) && (
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                onBlur={() => setTimeout(() => setShowDownloadMenu(false), 200)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-500 hover:to-purple-500 text-white rounded-xl transition-all shadow-lg shadow-teal-900/20 hover:shadow-teal-900/35 transform hover:-tranzinc-y-0.5 active:tranzinc-y-0 text-xs font-bold relative overflow-hidden group"
                title="Download"
                aria-label="Download options"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/40 z-50 py-1.5 animate-scale-in">
                  {activeImage.generatedUrl && (
                    <>
                      <button
                        onClick={() => {
                          handleDownloadSingle(activeImage.generatedUrl!, `design-${imageIndex + 1}`);
                          setShowDownloadMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 hover:text-white transition-colors flex items-center gap-3"
                      >
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="block font-medium text-xs">Result Only</span>
                          <span className="block text-[11px] text-zinc-500">Download AI design</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          handleDownloadComparison(activeImage.previewUrl, activeImage.generatedUrl!);
                          setShowDownloadMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800/60 hover:text-white transition-colors flex items-center gap-3"
                      >
                        <ColumnsIcon className="w-4 h-4 text-teal-400" />
                        <div>
                          <span className="block font-medium text-xs">Before & After</span>
                          <span className="block text-[11px] text-zinc-500">Side-by-side comparison</span>
                        </div>
                      </button>
                    </>
                  )}
                  {hasGeneratedImages && (
                    <>
                      <div className="border-t border-zinc-800/60 my-1.5" />
                      <button
                        onClick={() => {
                          if (!isDownloadingZip) handleDownloadAll();
                          // Don't close menu immediately to show feedback
                        }}
                        disabled={isDownloadingZip}
                        className={`w-full text-left px-4 py-2.5 text-sm text-zinc-200 transition-colors flex items-center gap-3 ${isDownloadingZip ? 'opacity-70 cursor-not-allowed' : 'hover:bg-zinc-800/60 hover:text-white'
                          }`}
                      >
                        {isDownloadingZip ? (
                          <div className="w-4 h-4 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                        ) : (
                          <DownloadIcon className="w-4 h-4 text-emerald-400" />
                        )}
                        <div>
                          <span className="block font-medium text-xs">
                            {isDownloadingZip ? 'Creating ZIP...' : 'Download All (ZIP)'}
                          </span>
                          <span className="block text-[11px] text-zinc-500">
                            {isDownloadingZip ? 'Please wait' : 'All generated designs'}
                          </span>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {activeImage.error && (
        <div className="bg-red-500/10 border border-red-500/15 text-red-300 p-3.5 rounded-xl mb-4 flex items-center gap-3 animate-scale-in flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="text-sm font-medium">Generation failed: {activeImage.error}</p>
        </div>
      )}

      {/* Preview Container */}
      <div className={`relative flex-1 min-h-0 bg-zinc-950/80 rounded-xl flex items-center justify-center border border-zinc-800/40 shadow-inner transition-all duration-500 ${zoom > 1 ? 'overflow-auto cursor-move' : 'overflow-hidden'}`}>

        {activeImage.isGenerating ? (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse rounded-full" />
              <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500" style={{ boxShadow: '0 0 20px rgba(59,130,246,0.4)' }} />
            </div>
            <div>
              <p className="text-lg font-medium text-white">Designing your space...</p>
              <p className="text-sm text-zinc-400 mt-1">This usually takes 15-30 seconds</p>
            </div>
          </div>
        ) : (
          <>
            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 -tranzinc-x-1/2 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-xl z-30 transition-opacity duration-300 hover:opacity-100 opacity-0 group-hover:opacity-100">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOutIcon className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-zinc-400 min-w-[3ch] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomInIcon className="w-4 h-4" />
              </button>
              {zoom > 1 && (
                <>
                  <div className="w-px h-3 bg-zinc-700 mx-1" />
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Reset Zoom"
                    aria-label="Reset Zoom"
                  >
                    <RefreshIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

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
              {viewMode === 'original' && (
                <div className="w-full h-full relative animate-fade-in">
                  <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain" />
                  {zoom === 1 && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 shadow-lg z-20">Original Photo</div>
                  )}
                </div>
              )}

              {/* Generated View */}
              {viewMode === 'generated' && activeImage.generatedUrl && (
                <div className="w-full h-full relative animate-fade-in">
                  <img src={activeImage.generatedUrl} alt="Generated" className="w-full h-full object-contain" />
                  {zoom === 1 && (
                    <div className="absolute bottom-4 left-4 bg-emerald-600/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg border border-emerald-400/20 z-20">AI Design</div>
                  )}
                </div>
              )}

              {/* Split View with Interactive Slider */}
              {viewMode === 'split' && activeImage.generatedUrl && (
                <ComparisonSlider
                  originalUrl={activeImage.previewUrl}
                  generatedUrl={activeImage.generatedUrl}
                />
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default PreviewArea;
