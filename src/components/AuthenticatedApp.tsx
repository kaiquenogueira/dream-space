import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Header from './Header';
import PropertyCreation from './PropertyCreation';
import SharePresentationModal from './SharePresentationModal';
import { RefreshIcon } from './Icons';
import { ArchitecturalStyle, GenerationMode, UploadedImage } from '../types';
import { compressImage } from '../utils/imageUtils';
import { useCredits } from '../hooks/useCredits';
import { useProject } from '../hooks/useProject';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { downloadComparison, downloadSingle, downloadAllImages } from '../utils/downloadUtils';
import type { UserProfile } from '../hooks/useAuth';
import { AnimatePresence } from 'framer-motion';

const Sidebar = lazy(() => import('./Sidebar'));
const DesignStudio = lazy(() => import('./DesignStudio'));
const PreviewArea = lazy(() => import('./PreviewArea'));
const MobileEditor = lazy(() => import('./MobileEditor'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const Pricing = lazy(() => import('./Pricing'));

// Hook to detect screen size
const useMedia = (query: string) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

type AuthenticatedAppProps = {
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

type NoCreditsBannerProps = {
  credits: number;
  plan: string;
  selectedCount: number;
  totalImages: number;
  onDismiss: () => void;
  onUpgradeClick: () => void;
};

const NoCreditsBanner: React.FC<NoCreditsBannerProps> = ({ credits, plan, selectedCount, totalImages, onDismiss, onUpgradeClick }) => (
  <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="text-sm text-amber-200">
        {credits === 0
          ? `Você usou todos os seus créditos (plano ${plan}). Faça o upgrade para mais gerações.`
          : `Créditos insuficientes para ${selectedCount} imagens. Você tem ${credits} crédito${credits !== 1 ? 's' : ''} restante${credits !== 1 ? 's' : ''}.`
        }
      </span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onUpgradeClick}
        className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1 rounded-lg transition-all whitespace-nowrap"
      >
        Ver Planos
      </button>
      <button
        onClick={onDismiss}
        className="text-amber-400/60 hover:text-amber-300 text-sm px-2"
      >
        ✕
      </button>
    </div>
  </div>
);

const FreePlanNotice: React.FC<{ onUpgradeClick: () => void }> = ({ onUpgradeClick }) => (
  <div className="bg-zinc-900/60 border-b border-zinc-800/40 px-4 py-2 flex items-center gap-2">
    <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <span className="text-xs text-zinc-500">
      Plano gratuito: as imagens são salvas em formato comprimido.{' '}
      <button onClick={onUpgradeClick} className="text-primary/70 hover:text-primary underline transition-colors">
        Faça o upgrade
      </button>{' '}
      para armazenamento em resolução máxima.
    </span>
  </div>
);

type GenerationToolbarProps = {
  generationMode: GenerationMode;
  setGenerationMode: React.Dispatch<React.SetStateAction<GenerationMode>>;
  selectedStyle: ArchitecturalStyle | null;
  setSelectedStyle: React.Dispatch<React.SetStateAction<ArchitecturalStyle | null>>;
  customPrompt: string;
  showControls: boolean;
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>;
  credits: number;
  hasCredits: boolean;
  selectedCount: number;
  totalImages: number;
  isGenerating: boolean;
  onGenerate: () => void;
};

const GenerationToolbar: React.FC<GenerationToolbarProps> = ({
  generationMode,
  setGenerationMode,
  selectedStyle,
  setSelectedStyle,
  customPrompt,
  showControls,
  setShowControls,
  credits,
  hasCredits,
  selectedCount,
  totalImages,
  isGenerating,
  onGenerate,
}) => (
  <div className="flex-shrink-0 border-b border-glass-border px-5 py-3 bg-surface-dark/40 backdrop-blur-sm">
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center bg-surface/60 p-0.5 rounded-lg border border-glass-border">
        {Object.values(GenerationMode).map((mode) => {
          let label = '🎨 Redesign';
          if (mode === GenerationMode.VIRTUAL_STAGING) label = '🪑 Mobiliar';
          if (mode === GenerationMode.PAINT_ONLY) label = '🖌️ Pintura';

          return (
            <button
              key={mode}
              onClick={() => setGenerationMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${generationMode === mode
                ? 'text-white bg-surface shadow-sm ring-1 ring-white/10'
                : 'text-text-muted hover:text-text-main'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setShowControls(!showControls)}
        aria-expanded={showControls}
        aria-controls="generation-controls-panel"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border focus-visible:ring-2 focus-visible:ring-secondary/50 focus:outline-none ${selectedStyle && generationMode !== GenerationMode.PAINT_ONLY
          ? 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/15 shadow-[0_0_10px_rgba(211,156,118,0.1)]'
          : 'bg-surface/60 border-glass-border text-text-muted hover:text-white hover:bg-surface/80 hover:border-white/20 hover:shadow-lg'
          }`}
      >
        {selectedStyle && generationMode !== GenerationMode.PAINT_ONLY ? (
          <>
            <span className="flex items-center gap-1.5 font-bold tracking-wide">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-secondary">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {selectedStyle}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showControls ? "rotate-180" : "rotate-0 text-text-muted/70"}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        ) : (
          <>
            <span className="tracking-wide">{generationMode === GenerationMode.PAINT_ONLY ? 'Cor / Textura' : 'Selecionar Estilo'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showControls ? "rotate-180 text-white" : "rotate-0 text-text-muted/70"}`}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </button>
      {customPrompt && (
        <span className="text-xs text-text-muted bg-surface/40 px-2 py-1 rounded-md border border-glass-border max-w-[200px] truncate">
          "{customPrompt}"
        </span>
      )}
      <div className="flex-1" />
      <span className={`text-xs font-medium px-2 py-1 rounded-md ${hasCredits
        ? 'text-primary/70 bg-primary/5'
        : 'text-red-400/70 bg-red-500/5'
        }`}>
        {credits} créditos
      </span>
      <button
        onClick={onGenerate}
        disabled={isGenerating || selectedCount === 0 || !hasCredits}
        className={`
          px-5 py-2 rounded-sm font-bold text-sm flex items-center gap-2 transition-all relative overflow-hidden group uppercase tracking-wider font-heading
          ${isGenerating || selectedCount === 0 || !hasCredits
            ? 'bg-surface/60 text-text-muted cursor-not-allowed border border-glass-border'
            : 'bg-gradient-to-r from-secondary to-secondary-light hover:from-secondary-dark hover:to-secondary text-black shadow-lg shadow-secondary/20 hover:shadow-secondary/35 hover:-translate-y-0.5 active:translate-y-0'
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              Gerar{selectedCount < totalImages ? ` (${selectedCount}/${totalImages})` : ''}
            </>
          )}
        </span>
        {!isGenerating && selectedCount > 0 && hasCredits && (
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
      </button>
    </div>
  </div>
);

type DesktopLayoutProps = {
  sidebarProps: React.ComponentProps<typeof Sidebar>;
  generationToolbarProps: GenerationToolbarProps;
  designStudioProps: React.ComponentProps<typeof DesignStudio>;
  previewAreaProps: React.ComponentProps<typeof PreviewArea>;
  showControls: boolean;
};

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  sidebarProps,
  generationToolbarProps,
  designStudioProps,
  previewAreaProps,
  showControls,
}) => (
  <main className="hidden lg:flex flex-1 overflow-hidden">
    <aside className="w-72 xl:w-80 flex-shrink-0 border-r border-glass-border overflow-y-auto p-4 custom-scrollbar">
      <Suspense fallback={<div className="p-4 text-text-muted">Carregando sidebar...</div>}>
        <Sidebar {...sidebarProps} />
      </Suspense>
    </aside>
    <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <GenerationToolbar {...generationToolbarProps} />
      {showControls && (
        <div id="generation-controls-panel" role="region" aria-label="Controles de Geração" className="flex-shrink-0 border-b border-glass-border px-5 py-4 bg-surface/30 animate-slide-down overflow-y-auto max-h-[220px] custom-scrollbar shadow-inner">
          <Suspense fallback={<div className="p-4 text-text-muted">Carregando estúdio...</div>}>
            <DesignStudio {...designStudioProps} />
          </Suspense>
        </div>
      )}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
        <Suspense fallback={<div className="p-4 text-text-muted">Carregando preview...</div>}>
          <PreviewArea {...previewAreaProps} />
        </Suspense>
      </div>
    </section>
  </main>
);

type MobileLayoutProps = {
  sidebarProps: React.ComponentProps<typeof Sidebar>;
  mobileEditorProps: React.ComponentProps<typeof MobileEditor>;
  mobileView: 'gallery' | 'editor';
};

const MobileLayout: React.FC<MobileLayoutProps> = ({ sidebarProps, mobileEditorProps, mobileView }) => (
  <main className="lg:hidden flex-1 overflow-hidden">
    {mobileView === 'gallery' ? (
      <div className="p-4 h-full overflow-hidden flex flex-col">
        <Suspense fallback={<div className="h-full flex items-center justify-center text-text-muted">Carregando galeria...</div>}>
          <Sidebar {...sidebarProps} />
        </Suspense>
      </div>
    ) : (
      <Suspense fallback={<div className="h-full flex items-center justify-center text-text-muted">Carregando editor...</div>}>
        <MobileEditor {...mobileEditorProps} />
      </Suspense>
    )}
  </main>
);

type AdminViewProps = {
  activeProperty: ReturnType<typeof useProject>['activeProperty'];
  setActivePropertyId: ReturnType<typeof useProject>['setActivePropertyId'];
  signOut: () => Promise<void>;
  profile: UserProfile | null;
  onBack: () => void;
};

const AdminView: React.FC<AdminViewProps> = ({ activeProperty, setActivePropertyId, signOut, profile, onBack }) => (
  <div className="min-h-screen bg-surface-dark flex flex-col font-sans">
    <Header
      activeProperty={activeProperty}
      setActivePropertyId={setActivePropertyId}
      handleLogout={signOut}
      profile={profile}
      onAdminClick={onBack}
      isAdminView={true}
    />
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Carregando...</div>}>
      <AdminDashboard onBack={onBack} />
    </Suspense>
  </div>
);

export const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ profile, refreshProfile, signOut }) => {
  const { credits, hasCredits, plan } = useCredits(profile, refreshProfile);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    properties,
    setProperties,
    activePropertyId,
    setActivePropertyId,
    selectedImageId,
    setSelectedImageId,
    activeProperty,
    images,
    setImages,
    handleCreateProperty,
    handleImagesSelected,
    removeImage,
    toggleImageSelection,
    toggleSelectAll,
    MAX_IMAGES
  } = useProject(profile?.id);

  const selectedCount = images.filter(img => img.selected).length;

  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.VIRTUAL_STAGING);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('split');
  const [showControls, setShowControls] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Detect desktop view
  const isDesktop = useMedia('(min-width: 1024px)');

  // Sync mobileView with URL
  const mobileView = location.pathname.includes('/editor') ? 'editor' : 'gallery';

  const {
    isGenerating,
    noCreditsError,
    setNoCreditsError,
    handleGenerate: generateImages,
    handleRegenerateSingle: regenerateImage
  } = useImageGeneration({
    images,
    setImages,
    credits,
    hasCredits,
    refreshProfile,
    activePropertyId,
    selectedStyle,
    generationMode,
    customPrompt
  });

  const activeImage = images.find(img => img.id === selectedImageId) || images[0];
  const activeImageIndex = activeImage ? images.indexOf(activeImage) : 0;

  const onImagesSelected = (newImages: UploadedImage[]) => {
    handleImagesSelected(newImages);
    if (!isDesktop) navigate('/app/editor');
  };

  const handleMobileImageSelect = (id: string) => {
    setSelectedImageId(id);
    navigate('/app/editor');
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    const nextIndex = (activeImageIndex + 1) % images.length;
    setSelectedImageId(images[nextIndex].id);
  };

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    const prevIndex = (activeImageIndex - 1 + images.length) % images.length;
    setSelectedImageId(images[prevIndex].id);
  };

  const handleGenerateWrapper = async () => {
    await generateImages(activeImage?.id);
    setViewMode('split');
  };

  const handleRegenerateSingleWrapper = async (imageId: string) => {
    await regenerateImage(imageId);
    setViewMode('split');
  };

  const handleIterateOnGenerated = (imageId: string) => {
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, iterateFromGenerated: true, selected: true } : img
    ));
    setCustomPrompt('');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activePropertyId) {
      const file = e.target.files[0];
      try {
        const { preview } = await compressImage(file);
        const logoUrl = preview;

        setProperties(prev => prev.map(p =>
          p.id === activePropertyId ? { ...p, logo: logoUrl } : p
        ));
      } catch (err) {
        console.error("Failed to upload logo", err);
      }
    }
  };

  const handleDownloadComparisonWrapper = async (originalUrl: string, generatedUrl: string) => {
    try {
      await downloadComparison(originalUrl, generatedUrl, activeProperty || null);
    } catch (err) {
      alert("Falha ao gerar a imagem de comparação. Por favor, tente novamente.");
    }
  };

  const handleVideoGeneratedWrapper = (videoUrl: string) => {
    if (!activeImage) return;
    setImages(prev => prev.map(img =>
      img.id === activeImage.id ? { ...img, videoUrl } : img
    ));
  };

  const handleDownloadAllWrapper = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadAllImages(images);
    } catch (err) {
      alert("Falha ao criar o arquivo ZIP. Por favor, tente baixar individualmente.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  if (!activePropertyId) {
    return (
      <PropertyCreation
        properties={properties}
        setActivePropertyId={setActivePropertyId}
        handleCreateProperty={handleCreateProperty}
      />
    );
  }

  const sharedSidebarProps = {
    images,
    selectedImageId,
    removeImage,
    maxImages: MAX_IMAGES,
    activeProperty,
    activePropertyId,
    setProperties,
    handleLogoUpload,
    toggleImageSelection,
    toggleSelectAll,
    handleRegenerateSingle: handleRegenerateSingleWrapper,
    isGenerating
  };

  const mobileSidebarProps: React.ComponentProps<typeof Sidebar> = {
    ...sharedSidebarProps,
    setSelectedImageId: handleMobileImageSelect,
    handleImagesSelected: onImagesSelected,
    compact: true
  };

  const desktopSidebarProps: React.ComponentProps<typeof Sidebar> = {
    ...sharedSidebarProps,
    setSelectedImageId,
    handleImagesSelected
  };

  const generationToolbarProps: GenerationToolbarProps = {
    generationMode,
    setGenerationMode,
    selectedStyle,
    setSelectedStyle,
    customPrompt,
    showControls,
    setShowControls,
    credits,
    hasCredits,
    selectedCount,
    totalImages: images.length,
    isGenerating,
    onGenerate: handleGenerateWrapper
  };

  const designStudioProps: React.ComponentProps<typeof DesignStudio> = {
    isGenerating,
    hasImages: images.length > 0,
    handleGenerateAll: handleGenerateWrapper,
    generationMode,
    setGenerationMode,
    selectedStyle,
    setSelectedStyle,
    customPrompt,
    setCustomPrompt
  };

  const previewAreaProps: React.ComponentProps<typeof PreviewArea> = {
    activeImage,
    imageIndex: activeImageIndex,
    totalImages: images.length,
    viewMode,
    setViewMode,
    handleDownloadComparison: handleDownloadComparisonWrapper,
    handleDownloadSingle: downloadSingle,
    handleDownloadAll: handleDownloadAllWrapper,
    onVideoGenerated: handleVideoGeneratedWrapper,
    onIterateOnGenerated: handleIterateOnGenerated,
    hasGeneratedImages: images.some(img => !!img.generatedUrl),
    isDownloadingZip,
    onNext: handleNextImage,
    onPrev: handlePrevImage,
    onSharePresentation: () => setIsShareModalOpen(true)
  };

  const mobileEditorProps: React.ComponentProps<typeof MobileEditor> = {
    activeImage,
    imageIndex: activeImageIndex,
    totalImages: images.length,
    hasGeneratedImages: images.some(img => !!img.generatedUrl),
    isDownloadingZip,
    onDownloadSingle: downloadSingle,
    onDownloadComparison: handleDownloadComparisonWrapper,
    onDownloadAll: handleDownloadAllWrapper,
    onDownloadVideo: handleVideoGeneratedWrapper,
    onSharePresentation: () => setIsShareModalOpen(true),
    onRegenerateSingle: handleRegenerateSingleWrapper,
    onBack: () => navigate('/app'),
    onNext: handleNextImage,
    onPrev: handlePrevImage,
    isGenerating,
    onGenerate: handleGenerateWrapper,
    onIterateOnGenerated: handleIterateOnGenerated,
    generationMode,
    setGenerationMode,
    selectedStyle,
    setSelectedStyle,
    customPrompt,
    setCustomPrompt
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-dark via-surface to-surface-dark text-text-main flex flex-col">
      <Header
        activeProperty={activeProperty}
        setActivePropertyId={setActivePropertyId}
        handleLogout={signOut}
        profile={profile}
        onAdminClick={() => navigate('/app/admin')}
        isAdminView={location.pathname === '/app/admin'}
        onPricingClick={() => navigate('/app/pricing')}
      />
      {noCreditsError && (
        <NoCreditsBanner
          credits={credits}
          plan={plan}
          selectedCount={selectedCount}
          totalImages={images.length}
          onDismiss={() => setNoCreditsError(false)}
          onUpgradeClick={() => navigate('/app/pricing')}
        />
      )}
      {plan === 'free' && images.some(img => img.generatedUrl) && <FreePlanNotice onUpgradeClick={() => navigate('/app/pricing')} />}

      <AnimatePresence mode="wait">
        <div key={location.pathname} className="flex-1 flex flex-col overflow-hidden relative">
          <Routes location={location}>
            {/* Mobile Routes */}
            {!isDesktop && (
              <>
                <Route path="/" element={<MobileLayout sidebarProps={mobileSidebarProps} mobileEditorProps={mobileEditorProps} mobileView="gallery" />} />
                <Route path="/editor" element={<MobileLayout sidebarProps={mobileSidebarProps} mobileEditorProps={mobileEditorProps} mobileView="editor" />} />
              </>
            )}

            {/* Desktop Routes */}
            {isDesktop && (
              <>
                <Route path="/" element={
                  <DesktopLayout
                    sidebarProps={desktopSidebarProps}
                    generationToolbarProps={generationToolbarProps}
                    designStudioProps={designStudioProps}
                    previewAreaProps={previewAreaProps}
                    showControls={showControls}
                  />
                } />
                <Route path="/editor" element={<Navigate to="/" replace />} />
              </>
            )}

            {/* Common Routes */}
            {profile?.is_admin && (
              <Route path="/admin" element={
                <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Carregando Admin...</div>}>
                  <AdminDashboard onBack={() => navigate('/app')} />
                </Suspense>
              } />
            )}

            <Route path="/pricing" element={
              <Suspense fallback={<div className="flex-1 flex items-center justify-center text-text-muted">Carregando...</div>}>
                <Pricing />
              </Suspense>
            } />
          </Routes>
        </div>
      </AnimatePresence>

      <SharePresentationModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        images={images}
        profile={profile}
        propertyTitle={activeProperty?.name}
      />
    </div>
  );
};
