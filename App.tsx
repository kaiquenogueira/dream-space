import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import Login from './components/Login';
import StyleSelector from './components/StyleSelector';
import { ArchitecturalStyle, UploadedImage, STYLE_PROMPTS, GenerationMode, Property } from './types';
import { generateRoomDesign, fileToBase64 } from './services/geminiService';
import { RefreshIcon, DownloadIcon, LayoutIcon, ArrowRightIcon, XIcon, MagicWandIcon, ColumnsIcon } from './components/Icons';

const MAX_IMAGES = 5;

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('dreamspace_token');
      if (token) {
        try {
          const res = await fetch('/api/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('dreamspace_token');
          }
        } catch (e) {
          localStorage.removeItem('dreamspace_token');
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('dreamspace_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('dreamspace_token');
    setIsAuthenticated(false);
  };

  const [properties, setProperties] = useState<Property[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [newPropertyName, setNewPropertyName] = useState('');

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(GenerationMode.REDESIGN);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Controls the view mode in the preview area
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('split');

  const activeProperty = properties.find(p => p.id === activePropertyId);
  const images = activeProperty ? activeProperty.images : [];

  const setImages = (action: React.SetStateAction<UploadedImage[]>) => {
    if (!activePropertyId) return;
    
    setProperties(prevProps => prevProps.map(prop => {
      if (prop.id !== activePropertyId) return prop;
      
      const newImages = typeof action === 'function' 
        ? (action as (prev: UploadedImage[]) => UploadedImage[])(prop.images)
        : action;
        
      return { ...prop, images: newImages };
    }));
  };

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropertyName.trim()) return;
    
    const newProp: Property = {
      id: crypto.randomUUID(),
      name: newPropertyName,
      images: [],
      createdAt: Date.now()
    };
    setProperties(prev => [...prev, newProp]);
    setActivePropertyId(newProp.id);
    setNewPropertyName('');
  };

  const activeImage = images.find(img => img.id === selectedImageId) || images[0];

  useEffect(() => {
    // If no image is selected but we have some, select the first one
    if (!selectedImageId && images.length > 0) {
      setSelectedImageId(images[0].id);
    }
  }, [images, selectedImageId]);

  const handleImagesSelected = (newImages: UploadedImage[]) => {
    setImages(prev => {
      const combined = [...prev, ...newImages];
      if (combined.length > MAX_IMAGES) {
        // This case is largely handled by Uploader, but double check
        return combined.slice(0, MAX_IMAGES);
      }
      return combined;
    });
    
    // Auto select the first new image if nothing selected
    if (!selectedImageId && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
      setViewMode('original'); // Default to original when uploading new files
    }
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

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

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `dreamspace-design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
         <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-blue-900/50">
            <LayoutIcon />
         </div>
         <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
           DreamSpace AI
         </h1>
         <p className="text-slate-400 mb-8 text-center max-w-md">
           Architectural redesign and virtual staging for real estate professionals.
         </p>

         <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">Create New Property Project</h2>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Property Name / Address</label>
                <input 
                  type="text" 
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  placeholder="e.g. 123 Ocean Drive, Apt 4B"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={!newPropertyName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
              >
                Start Project
              </button>
            </form>

            {properties.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-sm font-medium text-slate-500 mb-3 uppercase tracking-wider">Recent Projects</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {properties.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setActivePropertyId(p.id)}
                      className="w-full text-left px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all flex justify-between items-center group"
                    >
                      <span className="font-medium text-slate-300 group-hover:text-white">{p.name}</span>
                      <span className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePropertyId(null)}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <LayoutIcon />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent hidden sm:block">
                DreamSpace
              </h1>
            </div>
            
            <div className="h-6 w-px bg-slate-700 mx-2"></div>
            
            <div className="flex items-center gap-2">
               <span className="text-slate-400 text-sm">Project:</span>
               <span className="font-semibold text-white">{activeProperty?.name}</span>
               <button 
                 onClick={() => setActivePropertyId(null)}
                 className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded ml-2 transition-colors"
               >
                 Switch
               </button>
            </div>
            <button 
               onClick={handleLogout}
               className="ml-4 text-xs text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-1 rounded"
            >
               Logout
            </button>
          </div>
          <div className="text-sm text-slate-500 hidden md:block">
            Powered by Gemini 2.5 Flash Image
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Image List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center mb-2">
               <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold">My Spaces ({images.length}/{MAX_IMAGES})</h2>
            </div>
            
            <div className="space-y-3">
              {images.map(img => (
                <div 
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id)}
                  className={`
                    relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-video flex-shrink-0
                    ${selectedImageId === img.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 hover:border-slate-600'}
                  `}
                >
                  {/* Always show original previewUrl in the sidebar list */}
                  <img src={img.previewUrl} alt="Room" className="w-full h-full object-cover" />
                  
                  {/* Status Overlays */}
                  {img.isGenerating && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <RefreshIcon className="animate-spin text-blue-400 w-6 h-6" />
                    </div>
                  )}
                  {img.error && (
                    <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                       <span className="text-xs text-red-200 font-bold bg-red-900 px-2 py-1 rounded">Error</span>
                    </div>
                  )}
                  {!img.isGenerating && img.generatedUrl && (
                     <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  )}

                  <button 
                    onClick={(e) => removeImage(img.id, e)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
              
              <ImageUploader 
                onImagesSelected={handleImagesSelected} 
                currentCount={images.length}
                maxImages={MAX_IMAGES}
              />

              {/* Branding Section */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Project Branding</h3>
                <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  {activeProperty?.logo ? (
                    <div className="relative group w-10 h-10 bg-white rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img src={activeProperty.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button 
                        onClick={() => setProperties(prev => prev.map(p => p.id === activePropertyId ? { ...p, logo: undefined } : p))}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-dashed border-slate-600 text-slate-500 flex-shrink-0">
                      <span className="text-[10px]">Logo</span>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <label className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 font-medium truncate block">
                      {activeProperty?.logo ? 'Change Logo' : 'Upload Agency Logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    <p className="text-xs text-slate-500 truncate">Added to comparison exports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center/Right - Workspace */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* Configuration Section (Always visible) */}
            <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">Design Studio</h2>
                  <p className="text-slate-400">Apply one style to all uploaded photos.</p>
                </div>
                {/* Action Button */}
                <button 
                  onClick={handleGenerateAll}
                  disabled={isGenerating || images.length === 0}
                  className={`
                    px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all whitespace-nowrap
                    ${isGenerating || images.length === 0
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:translate-y-0'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <RefreshIcon className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <MagicWandIcon />
                      Generate Designs
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Mode</label>
                  <div className="flex bg-slate-800 p-1 rounded-lg w-fit">
                    {Object.values(GenerationMode).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setGenerationMode(mode)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          generationMode === mode
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Architectural Style</label>
                  <StyleSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Custom Instructions (Optional)</label>
                  <div className="relative">
                    <textarea 
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="E.g., Paint the walls sage green, add a leather armchair..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none h-20"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Active Image View */}
            {!activeImage ? (
              <div className="h-[40vh] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <LayoutIcon />
                <p className="mt-4 text-lg">Upload photos to start designing</p>
              </div>
            ) : (
              <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Preview: <span className="text-blue-400 text-base font-normal">Image {images.indexOf(activeImage) + 1}</span>
                  </h3>
                  
                  <div className="flex items-center bg-slate-800 rounded-lg p-1">
                     <button 
                       onClick={() => setViewMode('original')}
                       className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'original' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                     >
                       Original
                     </button>
                     <button 
                       onClick={() => setViewMode('generated')}
                       className={`px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'generated' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                       disabled={!activeImage.generatedUrl && !activeImage.isGenerating}
                     >
                       Result
                     </button>
                     <button 
                       onClick={() => setViewMode('split')}
                       className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1 ${viewMode === 'split' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                       disabled={!activeImage.generatedUrl && !activeImage.isGenerating}
                     >
                       <ColumnsIcon /> Side-by-Side
                     </button>
                  </div>

                  {activeImage.generatedUrl && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDownload(activeImage.generatedUrl!)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors text-sm font-medium"
                        title="Download Result"
                      >
                        <DownloadIcon />
                        Result
                      </button>
                      <button 
                        onClick={() => handleDownloadComparison(activeImage.previewUrl, activeImage.generatedUrl!)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors text-sm font-medium"
                        title="Download Comparison"
                      >
                        <ColumnsIcon />
                        Compare
                      </button>
                    </div>
                  )}
                </div>

                {activeImage.error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-4">
                    Generation failed: {activeImage.error}
                  </div>
                )}

                {/* Preview Container: Use aspect-video for single, flexible height for split to fit images better */}
                <div className={`relative w-full ${viewMode === 'split' ? 'h-[60vh] md:h-[600px]' : 'aspect-video'} bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300`}>
                  
                  {activeImage.isGenerating ? (
                    <div className="text-center space-y-4">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="text-slate-400 animate-pulse">Designing this room...</p>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                       
                       {/* Single View: Original */}
                       {viewMode === 'original' && (
                          <div className="w-full h-full relative">
                            <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain" />
                            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">Original Photo</div>
                          </div>
                       )}
                       
                       {/* Single View: Generated */}
                       {viewMode === 'generated' && activeImage.generatedUrl && (
                          <div className="w-full h-full relative">
                             <img src={activeImage.generatedUrl} alt="Generated" className="w-full h-full object-contain" />
                             <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">AI Redesign</div>
                          </div>
                       )}

                       {/* Split View */}
                       {viewMode === 'split' && activeImage.generatedUrl && (
                         <div className="flex w-full h-full gap-0.5 md:gap-1">
                            <div className="relative w-1/2 h-full bg-slate-900/50">
                                <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain" />
                                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">Original</div>
                            </div>
                            <div className="relative w-1/2 h-full bg-slate-900/50">
                                <img src={activeImage.generatedUrl} alt="Generated" className="w-full h-full object-contain" />
                                <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10">AI Redesign</div>
                            </div>
                         </div>
                       )}

                       {/* Fallback if view is generated/split but no result exists (e.g. error or cleared) */}
                       {(viewMode !== 'original' && !activeImage.generatedUrl) && (
                          <img src={activeImage.previewUrl} alt="Original" className="w-full h-full object-contain opacity-50" />
                       )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;