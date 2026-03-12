import React, { useRef, useState } from 'react';
import { UploadIcon, ImageIcon, CameraIcon } from './Icons';
import { UploadedImage } from '../types';
import { compressImage } from '../utils/imageUtils';

interface ImageUploaderProps {
  onImagesSelected: (images: UploadedImage[]) => void;
  currentCount: number;
  maxImages: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, currentCount, maxImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isLimitReached = currentCount >= maxImages;

  const processFiles = async (files: File[]) => {
    const remainingSlots = maxImages - currentCount;
    const filesToProcess = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      alert(`Você só pode enviar até ${maxImages} imagens no total. Processando as primeiras ${remainingSlots}.`);
    }

    const processedImages: UploadedImage[] = [];

    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const { base64, preview } = await compressImage(file);

        processedImages.push({
          id: crypto.randomUUID(),
          file: file,
          previewUrl: preview,
          base64: base64,
          selected: true,
          isGenerating: false
        });
      } catch (e) {
        console.error("Error processing file", e);
        alert(`Falha ao processar a imagem ${file.name}. Por favor, tente outra.`);
      }
    }
    onImagesSelected(processedImages);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      await processFiles(Array.from(event.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLimitReached) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLimitReached) return;
    const files = Array.from<File>(e.dataTransfer.files).filter(f => f.type?.startsWith('image/'));
    if (files.length > 0) await processFiles(files);
  };

  if (isLimitReached) {
    return (
      <div className="border border-dashed border-white/10 rounded-xl h-full flex flex-col items-center justify-center text-text-muted bg-primary-dark/80 backdrop-blur-md cursor-not-allowed p-2">
        <ImageIcon className="w-5 h-5 opacity-30 mb-1" />
        <p className="font-semibold text-[11px] text-center leading-tight">Limite Atingido</p>
        <p className="text-[8px] opacity-50 mt-0.5 uppercase tracking-widest text-center">Remover imagens</p>
      </div>
    );
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl h-full flex flex-col items-center justify-center transition-all duration-300 overflow-hidden cursor-pointer
        ${isDragging
          ? 'border-secondary bg-secondary/10 scale-[1.02]'
          : 'border-white/15 hover:border-secondary/50 bg-primary-dark/60 hover:bg-primary/30 backdrop-blur-md'
        }
      `}
      onClick={() => { if (!isLimitReached) fileInputRef.current?.click(); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        data-testid="image-uploader-input"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isLimitReached}
      />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={cameraInputRef}
        onChange={handleFileChange}
        disabled={isLimitReached}
      />

      {isDragging ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-3 gap-2">
          <div className="p-3 rounded-full border-2 border-secondary/40 bg-secondary/15 text-secondary animate-pulse">
            <UploadIcon className="w-6 h-6" />
          </div>
          <p className="font-bold text-sm text-secondary text-center">Solte aqui!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full px-2 py-2 gap-1.5 min-h-[80px]">
          {/* Main drop icon */}
          <div className="p-2 rounded-full bg-white/5 border border-white/10 text-text-muted/60">
            <UploadIcon className="w-4 h-4" />
          </div>

          {/* Drop text */}
          <p className="text-[10px] font-bold text-text-muted/80 leading-tight text-center">Arraste fotos aqui</p>

          {/* Divider */}
          <div className="flex items-center gap-1.5 w-full px-1">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[8px] text-text-muted/40 uppercase tracking-widest font-bold">ou</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!isLimitReached) fileInputRef.current?.click(); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-muted/70 hover:text-secondary hover:border-secondary/30 hover:bg-secondary/10 transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-secondary"
            >
              <UploadIcon className="w-2.5 h-2.5" />
              <span className="text-[8px] font-bold uppercase tracking-wider">Enviar</span>
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!isLimitReached) cameraInputRef.current?.click(); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-muted/70 hover:text-secondary hover:border-secondary/30 hover:bg-secondary/10 transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-secondary"
            >
              <CameraIcon className="w-2.5 h-2.5" />
              <span className="text-[8px] font-bold uppercase tracking-wider">Câmera</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
