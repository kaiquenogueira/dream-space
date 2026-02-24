import React, { useState } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DesignStudio from './components/DesignStudio';
import PreviewArea from './components/PreviewArea';
import PropertyCreation from './components/PropertyCreation';
import { RefreshIcon } from './components/Icons';
import { ArchitecturalStyle, GenerationMode, UploadedImage } from './types';
import { generateRoomDesign, fileToBase64 } from './services/geminiService';
import { compressImage } from './utils/imageUtils';
import { buildPrompt } from './utils/promptBuilder';
import { useAuth } from './hooks/useAuth';
import { useCredits } from './hooks/useCredits';
import { useProject } from './hooks/useProject';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import MobileEditor from './components/MobileEditor';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const {
    isAuthenticated,
    isCheckingAuth,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    profile,
    refreshProfile,
  } = useAuth();

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
  } = useProject();

  const selectedCount = images.filter(img => img.selected).length;

  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.REDESIGN);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('split');
  const [appView, setAppView] = useState<'app' | 'admin'>('app');
  const [mobileView, setMobileView] = useState<'gallery' | 'editor'>('gallery');
  const [showControls, setShowControls] = useState(true);
  const [noCreditsError, setNoCreditsError] = useState(false);

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

  const generateForImage = async (img: UploadedImage, prompt: string) => {
    try {
      const response = await generateRoomDesign(
        img.base64,
        prompt,
        activePropertyId || undefined,
        selectedStyle || undefined,
        generationMode,
      );

      setImages(current => current.map(i =>
        i.id === img.id
          ? { ...i, generatedUrl: response.result, isGenerating: false, selected: false }
          : i
      ));

      // Refresh profile to update credits display
      await refreshProfile();

      // Show compression warning for free tier
      if (response.is_compressed) {
        console.info('Imagem salva em formato comprimido (plano gratuito). Resolução máxima disponível nos planos premium.');
      }
    } catch (err: any) {
      console.error(`Error generating for image ${img.id}:`, err);

      if (err.message?.includes('No credits remaining') || err.message?.includes('credits')) {
        setNoCreditsError(true);
      }

      setImages(current => current.map(i =>
        i.id === img.id ? { ...i, error: err.message || "Failed", isGenerating: false } : i
      ));
    }
  };

  const handleGenerate = async () => {
    if (!hasCredits) {
      setNoCreditsError(true);
      return;
    }

    const imagesToGenerate = images.filter(img => img.selected);
    if (imagesToGenerate.length === 0) return;

    // Check if user has enough credits for all selected images
    if (imagesToGenerate.length > credits) {
      setNoCreditsError(true);
      return;
    }

    setNoCreditsError(false);
    setIsGenerating(true);

    setImages(prev => prev.map(img => img.selected ? { ...img, isGenerating: true, error: undefined } : img));

    const finalPrompt = buildPrompt({ generationMode, selectedStyle, customPrompt });
    console.log("Starting selective generation with prompt:", finalPrompt, `(${imagesToGenerate.length} images)`);

    await Promise.all(imagesToGenerate.map(img => generateForImage(img, finalPrompt)));

    setIsGenerating(false);
    setViewMode('split');
  };

  const handleRegenerateSingle = async (imageId: string) => {
    if (!hasCredits) {
      setNoCreditsError(true);
      return;
    }

    const img = images.find(i => i.id === imageId);
    if (!img) return;

    setNoCreditsError(false);
    setIsGenerating(true);
    setImages(prev => prev.map(i => i.id === imageId ? { ...i, isGenerating: true, error: undefined } : i));

    const finalPrompt = buildPrompt({ generationMode, selectedStyle, customPrompt });
    await generateForImage(img, finalPrompt);

    setIsGenerating(false);
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

  const handleDownloadComparison = async (originalUrl: string, generatedUrl: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    try {
      const [img1, img2] = await Promise.all([loadImage(originalUrl), loadImage(generatedUrl)]);

      const width = img1.width + img2.width;
      const height = Math.max(img1.height, img2.height);
      const footerHeight = 80;

      canvas.width = width;
      canvas.height = height + footerHeight;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img1, 0, 0);
      ctx.drawImage(img2, img1.width, 0);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      const labelW = 120;
      const labelH = 40;

      ctx.fillRect(20, 20, labelW, labelH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("ANTES", 40, 48);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(img1.width + 20, 20, labelW, labelH);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("DEPOIS", img1.width + 40, 48);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, height, width, footerHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      const propName = activeProperty?.name || "DreamSpace Design";
      ctx.fillText(propName, 30, height + 50);

      if (activeProperty?.logo) {
        const logo = await loadImage(activeProperty.logo);
        const maxLogoH = footerHeight - 20;
        const scale = maxLogoH / logo.height;
        const logoW = logo.width * scale;
        const logoH = logo.height * scale;

        ctx.drawImage(logo, width - logoW - 30, height + 10, logoW, logoH);
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Gerado com DreamSpace AI", width - 30, height + 45);
      }

      const link = document.createElement('a');
      link.download = `comparison-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate comparison", err);
      alert("Falha ao gerar a imagem de comparação. Por favor, tente novamente.");
    }
  };

  const handleDownloadSingle = (url: string, name: string) => {
    const link = document.createElement('a');
    link.download = `${name}-${Date.now()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    const generatedImages = images.filter(img => img.generatedUrl);
    if (generatedImages.length === 0) return;

    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder("dreamspace-designs");

      if (!folder) throw new Error("Could not create zip folder");

      for (const [index, img] of generatedImages.entries()) {
        const url = img.generatedUrl!;

        const arr = url.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });

        const extension = mime.split('/')[1] || 'png';
        folder.file(`design-${index + 1}.${extension}`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "dreamspace-designs.zip");
    } catch (err) {
      console.error("Failed to generate ZIP", err);
      alert("Falha ao criar o arquivo ZIP. Por favor, tente baixar individualmente.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  if (isCheckingAuth) {
    console.log('[App] Waiting for auth check...');
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshIcon className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[App] Not authenticated, showing Login');
    return (
      <Login
        onSignIn={signInWithEmail}
        onSignUp={signUpWithEmail}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

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
      <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
        <Header
          activeProperty={activeProperty}
          setActivePropertyId={setActivePropertyId}
          handleLogout={signOut}
          profile={profile}
          onAdminClick={() => setAppView('app')}
          isAdminView={true}
        />
        <AdminDashboard onBack={() => setAppView('app')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-200 flex flex-col">
      <Header
        activeProperty={activeProperty}
        setActivePropertyId={setActivePropertyId}
        handleLogout={signOut}
        profile={profile}
        onAdminClick={() => setAppView('admin')}
        isAdminView={false}
      />

      {/* No Credits Banner */}
      {noCreditsError && (
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
            onClick={() => setNoCreditsError(false)}
            className="text-amber-400/60 hover:text-amber-300 text-sm px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Free tier compression notice */}
      {plan === 'free' && images.some(img => img.generatedUrl) && (
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
      )}

      {/* ─── MOBILE VIEW ─── */}
      <main className="lg:hidden flex-1 overflow-hidden">
        {mobileView === 'gallery' ? (
          <div className="p-4 h-full overflow-y-auto">
            <Sidebar
              images={images}
              selectedImageId={selectedImageId}
              setSelectedImageId={handleMobileImageSelect}
              removeImage={removeImage}
              handleImagesSelected={onImagesSelected}
              maxImages={MAX_IMAGES}
              activeProperty={activeProperty}
              activePropertyId={activePropertyId}
              setProperties={setProperties}
              handleLogoUpload={handleLogoUpload}
              toggleImageSelection={toggleImageSelection}
              toggleSelectAll={toggleSelectAll}
              handleRegenerateSingle={handleRegenerateSingle}
              isGenerating={isGenerating}
              compact
            />
          </div>
        ) : (
          <MobileEditor
            activeImage={activeImage}
            onRegenerateSingle={handleRegenerateSingle}
            onBack={() => setMobileView('gallery')}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            generationMode={generationMode}
            setGenerationMode={setGenerationMode}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
          />
        )}
      </main>

      {/* ─── DESKTOP VIEW ─── */}
      <main className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left Panel: Sidebar (fixed width) */}
        <aside className="w-72 xl:w-80 flex-shrink-0 border-r border-zinc-800/40 overflow-y-auto p-4 custom-scrollbar">
          <Sidebar
            images={images}
            selectedImageId={selectedImageId}
            setSelectedImageId={setSelectedImageId}
            removeImage={removeImage}
            handleImagesSelected={handleImagesSelected}
            maxImages={MAX_IMAGES}
            activeProperty={activeProperty}
            activePropertyId={activePropertyId}
            setProperties={setProperties}
            handleLogoUpload={handleLogoUpload}
            toggleImageSelection={toggleImageSelection}
            toggleSelectAll={toggleSelectAll}
            handleRegenerateSingle={handleRegenerateSingle}
            isGenerating={isGenerating}
          />
        </aside>

        {/* Center: Preview (takes all remaining space) */}
        <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Inline controls bar: mode + style + generate (compact, always visible) */}
          <div className="flex-shrink-0 border-b border-zinc-800/40 px-5 py-3 bg-zinc-950/40 backdrop-blur-sm">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Mode Toggle (compact) */}
              <div className="flex items-center bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-800/40">
                {Object.values(GenerationMode).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGenerationMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${generationMode === mode
                      ? 'text-white bg-zinc-800 shadow-sm ring-1 ring-white/10'
                      : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                  >
                    {mode === GenerationMode.REDESIGN ? '🎨 Redesign' : '🪑 Mobiliar'}
                  </button>
                ))}
              </div>

              {/* Selected Style badge */}
              <button
                onClick={() => setShowControls(!showControls)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${selectedStyle
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15'
                  : 'bg-zinc-900/60 border-zinc-800/40 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
              >
                {selectedStyle ? (
                  <>
                    <span>✓ {selectedStyle}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={showControls ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                    </svg>
                  </>
                ) : (
                  <>
                    Selecionar Estilo
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={showControls ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                    </svg>
                  </>
                )}
              </button>

              {/* Custom prompt indicator */}
              {customPrompt && (
                <span className="text-xs text-zinc-500 bg-zinc-800/40 px-2 py-1 rounded-md border border-zinc-700/30 max-w-[200px] truncate">
                  "{customPrompt}"
                </span>
              )}

              <div className="flex-1" />

              {/* Credits mini indicator */}
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${hasCredits
                ? 'text-emerald-400/70 bg-emerald-500/5'
                : 'text-red-400/70 bg-red-500/5'
                }`}>
                {credits} créditos
              </span>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedCount === 0 || !hasCredits}
                className={`
                  px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all relative overflow-hidden group
                  ${isGenerating || selectedCount === 0 || !hasCredits
                    ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-zinc-700/40'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 hover:-translate-y-0.5 active:translate-y-0'
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
                      Gerar{selectedCount < images.length ? ` (${selectedCount}/${images.length})` : ''}
                    </>
                  )}
                </span>
                {!isGenerating && selectedCount > 0 && hasCredits && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Design Controls */}
          {showControls && (
            <div className="flex-shrink-0 border-b border-zinc-800/40 px-5 py-4 bg-zinc-900/30 animate-slide-down overflow-y-auto max-h-[320px] custom-scrollbar">
              <DesignStudio
                isGenerating={isGenerating}
                hasImages={images.length > 0}
                handleGenerateAll={handleGenerate}
                generationMode={generationMode}
                setGenerationMode={setGenerationMode}
                selectedStyle={selectedStyle}
                setSelectedStyle={setSelectedStyle}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
              />
            </div>
          )}

          {/* Preview Area (fills remaining space) */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
            <PreviewArea
              activeImage={activeImage}
              imageIndex={activeImageIndex}
              totalImages={images.length}
              viewMode={viewMode}
              setViewMode={setViewMode}
              handleDownloadComparison={handleDownloadComparison}
              handleDownloadSingle={handleDownloadSingle}
              handleDownloadAll={handleDownloadAll}
              hasGeneratedImages={images.some(img => !!img.generatedUrl)}
              isDownloadingZip={isDownloadingZip}
              onNext={handleNextImage}
              onPrev={handlePrevImage}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
