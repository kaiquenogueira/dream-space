import React, { useState } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DesignStudio from './components/DesignStudio';
import PreviewArea from './components/PreviewArea';
import PropertyCreation from './components/PropertyCreation';
import { RefreshIcon } from './components/Icons';
import { ArchitecturalStyle, GenerationMode, UploadedImage, STYLE_PROMPTS } from './types';
import { generateRoomDesign, fileToBase64 } from './services/geminiService';
import { compressImage } from './utils/imageUtils';
import { useAuth } from './hooks/useAuth';
import { useProject } from './hooks/useProject';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import MobileEditor from './components/MobileEditor';

const App: React.FC = () => {
  const { isAuthenticated, isCheckingAuth, handleLogin, handleLogout } = useAuth();
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
  const [mobileView, setMobileView] = useState<'gallery' | 'editor'>('gallery');
  const [showControls, setShowControls] = useState(false);

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

  const buildPrompt = () => {
    let finalPrompt = '';

    if (generationMode === GenerationMode.VIRTUAL_STAGING) {
      if (selectedStyle) {
        finalPrompt = `This is an empty room. Furnish this room with ${STYLE_PROMPTS[selectedStyle]} furniture. Keep the original walls, floor, and ceiling structure exactly as is. Add realistic lighting and shadows. Ensure photorealistic quality.`;
      } else {
        finalPrompt = `This is an empty room. Furnish this room with modern furniture appropriate for its size and layout. Keep the original walls, floor, and ceiling structure exactly as is. Add realistic lighting and shadows. Ensure photorealistic quality.`;
      }
    } else {
      if (selectedStyle) {
        finalPrompt = `Redesign this interior space in a ${STYLE_PROMPTS[selectedStyle]}. Apply appropriate furniture, lighting, and wall colors. Maintain the original structural layout (windows, doors, floors). Ensure photorealistic quality.`;
      }
    }

    if (customPrompt) {
      if (finalPrompt) {
        finalPrompt += ` Also, ${customPrompt}`;
      } else {
        finalPrompt = `Edit this image: ${customPrompt}`;
      }
    }

    if (!finalPrompt) {
      finalPrompt = "Enhance this room with modern interior design, keeping the structure intact.";
    }

    return finalPrompt;
  };

  const generateForImage = async (img: UploadedImage, prompt: string) => {
    try {
      const result = await generateRoomDesign(img.base64, prompt);
      setImages(current => current.map(i => i.id === img.id ? { ...i, generatedUrl: result, isGenerating: false, selected: false } : i));
    } catch (err: any) {
      console.error(`Error generating for image ${img.id}:`, err);
      setImages(current => current.map(i => i.id === img.id ? { ...i, error: err.message || "Failed", isGenerating: false } : i));
    }
  };

  const handleGenerate = async () => {
    const imagesToGenerate = images.filter(img => img.selected);
    if (imagesToGenerate.length === 0) return;

    setIsGenerating(true);

    // Set only selected images to generating state
    setImages(prev => prev.map(img => img.selected ? { ...img, isGenerating: true, error: undefined } : img));

    const finalPrompt = buildPrompt();
    console.log("Starting selective generation with prompt:", finalPrompt, `(${imagesToGenerate.length} images)`);

    await Promise.all(imagesToGenerate.map(img => generateForImage(img, finalPrompt)));

    setIsGenerating(false);
    setViewMode('split');
  };

  const handleRegenerateSingle = async (imageId: string) => {
    const img = images.find(i => i.id === imageId);
    if (!img) return;

    setIsGenerating(true);
    setImages(prev => prev.map(i => i.id === imageId ? { ...i, isGenerating: true, error: undefined } : i));

    const finalPrompt = buildPrompt();
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

    // Load images
    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    try {
      const [img1, img2] = await Promise.all([loadImage(originalUrl), loadImage(generatedUrl)]);

      // Set canvas size (side by side)
      const width = img1.width + img2.width;
      const height = Math.max(img1.height, img2.height);
      const footerHeight = 80;

      canvas.width = width;
      canvas.height = height + footerHeight;

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw images
      ctx.drawImage(img1, 0, 0);
      ctx.drawImage(img2, img1.width, 0);

      // Draw "Before" / "After" labels
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      const labelW = 120;
      const labelH = 40;

      // Before Label
      ctx.fillRect(20, 20, labelW, labelH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("BEFORE", 40, 48);

      // After Label
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(img1.width + 20, 20, labelW, labelH);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("AFTER", img1.width + 45, 48);

      // Draw Footer
      ctx.fillStyle = "#0f172a"; // Slate-900
      ctx.fillRect(0, height, width, footerHeight);

      // Draw Property Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px sans-serif";
      const propName = activeProperty?.name || "DreamSpace Design";
      ctx.fillText(propName, 30, height + 50);

      // Draw Logo if exists
      if (activeProperty?.logo) {
        const logo = await loadImage(activeProperty.logo);
        // Resize logo to fit in footer height - 20px padding
        const maxLogoH = footerHeight - 20;
        const scale = maxLogoH / logo.height;
        const logoW = logo.width * scale;
        const logoH = logo.height * scale;

        ctx.drawImage(logo, width - logoW - 30, height + 10, logoW, logoH);
      } else {
        // Draw default text
        ctx.fillStyle = "#94a3b8"; // Slate-400
        ctx.font = "16px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Generated with DreamSpace AI", width - 30, height + 45);
      }

      // Download
      const link = document.createElement('a');
      link.download = `comparison-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate comparison", err);
      alert("Failed to generate comparison image. Please try again.");
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

        // Convert data URL to Blob for JSZip
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

        // Add to zip
        const extension = mime.split('/')[1] || 'png';
        folder.file(`design-${index + 1}.${extension}`, blob);
      }

      // Generate and save
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "dreamspace-designs.zip");
    } catch (err) {
      console.error("Failed to generate ZIP", err);
      alert("Failed to create ZIP file. Please try downloading individually.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshIcon className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-200 flex flex-col">
      <Header
        activeProperty={activeProperty}
        setActivePropertyId={setActivePropertyId}
        handleLogout={handleLogout}
      />

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
                    {mode === GenerationMode.REDESIGN ? '🎨 Redesign' : '🪑 Furnish'}
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
                    Select Style
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={showControls ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
                    </svg>
                  </>
                )}
              </button>

              {/* Custom prompt indicator */}
              {customPrompt && (
                <span className="text-[10px] text-zinc-500 bg-zinc-800/40 px-2 py-1 rounded-md border border-zinc-700/30 max-w-[200px] truncate">
                  "{customPrompt}"
                </span>
              )}

              <div className="flex-1" />

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedCount === 0}
                className={`
                  px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all relative overflow-hidden group
                  ${isGenerating || selectedCount === 0
                    ? 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-zinc-700/40'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/35 hover:-tranzinc-y-0.5 active:tranzinc-y-0'
                  }
                `}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <RefreshIcon className="animate-spin w-4 h-4" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                      Generate{selectedCount < images.length ? ` (${selectedCount}/${images.length})` : ''}
                    </>
                  )}
                </span>
                {!isGenerating && selectedCount > 0 && (
                  <div className="absolute inset-0 -tranzinc-x-full group-hover:tranzinc-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
