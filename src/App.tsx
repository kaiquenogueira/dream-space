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
import { useAuth } from './hooks/useAuth';
import { useProject } from './hooks/useProject';

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
    MAX_IMAGES
  } = useProject();

  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.REDESIGN);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('split');

  const activeImage = images.find(img => img.id === selectedImageId) || images[0];
  const activeImageIndex = activeImage ? images.indexOf(activeImage) : 0;

  const handleGenerateAll = async () => {
    if (images.length === 0) return;

    setIsGenerating(true);
    
    // Set all images to generating state
    setImages(prev => prev.map(img => ({ ...img, isGenerating: true, error: undefined })));

    // Construct prompt once for all
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

    console.log("Starting batch generation with prompt:", finalPrompt);

    // Process images in parallel
    const generateForImage = async (img: UploadedImage) => {
       try {
         const result = await generateRoomDesign(img.base64, finalPrompt);
         setImages(current => current.map(i => i.id === img.id ? { ...i, generatedUrl: result, isGenerating: false } : i));
       } catch (err: any) {
         console.error(`Error generating for image ${img.id}:`, err);
         setImages(current => current.map(i => i.id === img.id ? { ...i, error: err.message || "Failed", isGenerating: false } : i));
       }
    };

    await Promise.all(images.map(img => generateForImage(img)));
    
    setIsGenerating(false);
    // Switch view mode to split to show results comparison immediately
    setViewMode('split');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activePropertyId) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        const logoUrl = `data:${file.type};base64,${base64}`;
        
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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshIcon className="animate-spin text-blue-500 w-8 h-8" />
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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Header
        activeProperty={activeProperty}
        setActivePropertyId={setActivePropertyId}
        handleLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
          />

          <div className="lg:col-span-9 space-y-8">
            <DesignStudio
              isGenerating={isGenerating}
              hasImages={images.length > 0}
              handleGenerateAll={handleGenerateAll}
              generationMode={generationMode}
              setGenerationMode={setGenerationMode}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
            />

            <PreviewArea
              activeImage={activeImage}
              imageIndex={activeImageIndex}
              viewMode={viewMode}
              setViewMode={setViewMode}
              handleDownloadComparison={handleDownloadComparison}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
