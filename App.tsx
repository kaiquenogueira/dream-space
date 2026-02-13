import React, { useState, useRef, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import StyleSelector from './components/StyleSelector';
import { ArchitecturalStyle, UploadedImage, STYLE_PROMPTS } from './types';
import { generateRoomDesign } from './services/geminiService';
import { RefreshIcon, DownloadIcon, LayoutIcon, ArrowRightIcon, XIcon, MagicWandIcon, ColumnsIcon } from './components/Icons';

const MAX_IMAGES = 5;

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Controls the view mode in the preview area
  const [viewMode, setViewMode] = useState<'original' | 'generated' | 'split'>('split');

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
    if (selectedStyle) {
      finalPrompt = `Redesign this interior space in a ${STYLE_PROMPTS[selectedStyle]}. Apply appropriate furniture, lighting, and wall colors. Maintain the original structural layout (windows, doors, floors). Ensure photorealistic quality.`;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <LayoutIcon />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              DreamSpace AI
            </h1>
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
                      ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-blue-500/25'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <RefreshIcon className="animate-spin" />
                      Designing {images.length} Rooms...
                    </>
                  ) : (
                    <>
                      <MagicWandIcon />
                      Generate {images.length > 0 ? `All (${images.length})` : ''}
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
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
                    <button 
                      onClick={() => handleDownload(activeImage.generatedUrl!)}
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <DownloadIcon />
                      Download
                    </button>
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