import React, { Suspense, lazy, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DesignStudio from './DesignStudio';
import PreviewArea from './PreviewArea';
import PropertyCreation from './PropertyCreation';
import { RefreshIcon } from './Icons';
import { ArchitecturalStyle, GenerationMode, UploadedImage } from '../types';
import { compressImage } from '../utils/imageUtils';
import { useCredits } from '../hooks/useCredits';
import { useProject } from '../hooks/useProject';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { downloadComparison, downloadSingle, downloadAllImages } from '../utils/downloadUtils';
import type { UserProfile } from '../hooks/useAuth';

const MobileEditor = lazy(() => import('./MobileEditor'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

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
};

const NoCreditsBanner: React.FC<NoCreditsBannerProps> = ({ credits, plan, selectedCount, totalImages, onDismiss }) => (
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
    <button
      onClick={onDismiss}
      className="text-amber-400/60 hover:text-amber-300 text-sm px-2"
    >
      ✕
    </button>
  </div>
);

const FreePlanNotice = () => (
  <div className="bg-zinc-900/60 border-b border-zinc-800/40 px-4 py-2 flex items-center gap-2">
    <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
    <span className="text-xs text-zinc-500">
      Plano gratuito: as imagens são salvas em formato comprimido. Alguma perda de resolução pode ocorrer ao recuperar em sessões futuras. Faça o upgrade para armazenamento em resolução máxima.
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${selectedStyle
          ? 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/15'
          : 'bg-surface/60 border-glass-border text-text-muted hover:text-text-main hover:border-text-muted'
          }`}
      >
        {selectedStyle && generationMode !== GenerationMode.PAINT_ONLY ? (
          <>
            <span>✓ {selectedStyle}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={showControls ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
            </svg>
          </>
        ) : (
          <>
            {generationMode === GenerationMode.PAINT_ONLY ? 'Cor / Textura' : 'Selecionar Estilo'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={showControls ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
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
      <Sidebar {...sidebarProps} />
    </aside>
    <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <GenerationToolbar {...generationToolbarProps} />
      {showControls && (
        <div className="flex-shrink-0 border-b border-glass-border px-5 py-2 bg-surface/30 animate-slide-down overflow-y-auto max-h-[220px] custom-scrollbar">
          <DesignStudio {...designStudioProps} />
        </div>
      )}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
        <PreviewArea {...previewAreaProps} />
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
      <div className="p-4 h-full overflow-y-auto">
        <Sidebar {...sidebarProps} />
      </div>
    ) : (
      <Suspense fallback={<div className="h-full flex items-center justify-center text-text-muted">Carregando...</div>}>
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
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.REDESIGN);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('split');
  const [appView, setAppView] = useState<'app' | 'admin'>('app');
  const [mobileView, setMobileView] = useState<'gallery' | 'editor'>('gallery');
  const [showControls, setShowControls] = useState(true);

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
    setMobileView('editor');
  };

  const handleMobileImageSelect = (id: string) => {
    setSelectedImageId(id);
    setMobileView('editor');
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
    await generateImages();
    setViewMode('split');
  };

  const handleRegenerateSingleWrapper = async (imageId: string) => {
    await regenerateImage(imageId);
    setViewMode('split');
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

  if (appView === 'admin' && profile?.is_admin) {
    return (
      <AdminView
        activeProperty={activeProperty}
        setActivePropertyId={setActivePropertyId}
        signOut={signOut}
        profile={profile}
        onBack={() => setAppView('app')}
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
    hasGeneratedImages: images.some(img => !!img.generatedUrl),
    isDownloadingZip,
    onNext: handleNextImage,
    onPrev: handlePrevImage
  };

  const mobileEditorProps: React.ComponentProps<typeof MobileEditor> = {
    activeImage,
    onRegenerateSingle: handleRegenerateSingleWrapper,
    onBack: () => setMobileView('gallery'),
    isGenerating,
    onGenerate: handleGenerateWrapper,
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
        onAdminClick={() => setAppView('admin')}
        isAdminView={false}
      />
      {noCreditsError && (
        <NoCreditsBanner
          credits={credits}
          plan={plan}
          selectedCount={selectedCount}
          totalImages={images.length}
          onDismiss={() => setNoCreditsError(false)}
        />
      )}
      {plan === 'free' && images.some(img => img.generatedUrl) && <FreePlanNotice />}
      <MobileLayout
        sidebarProps={mobileSidebarProps}
        mobileEditorProps={mobileEditorProps}
        mobileView={mobileView}
      />
      <DesktopLayout
        sidebarProps={desktopSidebarProps}
        generationToolbarProps={generationToolbarProps}
        designStudioProps={designStudioProps}
        previewAreaProps={previewAreaProps}
        showControls={showControls}
      />
    </div>
  );
};
