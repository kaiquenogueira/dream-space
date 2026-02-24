import React, { useRef, useState } from 'react';
import { UploadIcon, ImageIcon, PlusIcon, CameraIcon } from './Icons';
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
        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        const { base64, preview } = await compressImage(file);
        console.log(`Compressed size: ${(base64.length * 0.75 / 1024 / 1024).toFixed(2)} MB`);

        const base64Content = base64;
        const result = preview;

        processedImages.push({
          id: Math.random().toString(36).substring(7),
          file: file,
          previewUrl: result,
          base64: base64Content,
          selected: true
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
    const files = Array.from(e.dataTransfer.files).filter((f: any) => f.type?.startsWith('image/')) as File[];
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
        relative border border-dashed rounded-xl h-full flex flex-col items-center justify-center transition-all duration-300 overflow-hidden
        ${isDragging
          ? 'border-secondary bg-secondary/5 scale-[1.02]'
          : 'border-white/10 hover:border-secondary/40 bg-primary-dark/60 hover:bg-primary/40 backdrop-blur-md'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
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
        <div className="flex flex-col items-center justify-center w-full h-full p-2">
          <div className="p-1.5 rounded-full mb-1 border border-secondary/20 bg-secondary/10 text-secondary scale-110 transition-all duration-300">
            <PlusIcon className="w-4 h-4" />
          </div>
          <p className="font-bold text-[9px] uppercase tracking-widest text-secondary text-center px-2">Solte aqui</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full p-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); !isLimitReached && fileInputRef.current?.click(); }}
              className="flex flex-col items-center gap-1 group outline-none"
            >
              <div className="p-2 rounded-full bg-white/5 text-text-muted border border-white/5 group-hover:text-secondary group-hover:bg-secondary/10 group-hover:border-secondary/20 transition-all duration-300 group-focus-visible:ring-1 group-focus-visible:ring-secondary shadow-inner hover:shadow-[0_0_15px_rgba(211,156,118,0.15)] flex items-center justify-center">
                <UploadIcon className="w-4 h-4" />
              </div>
              <span className="font-bold text-[8px] uppercase tracking-widest text-text-muted/70 group-hover:text-text-main transition-colors">Enviar</span>
            </button>

            <div className="w-[1px] h-6 bg-white/10"></div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); !isLimitReached && cameraInputRef.current?.click(); }}
              className="flex flex-col items-center gap-1 group outline-none"
            >
              <div className="p-2 rounded-full bg-white/5 text-text-muted border border-white/5 group-hover:text-secondary group-hover:bg-secondary/10 group-hover:border-secondary/20 transition-all duration-300 group-focus-visible:ring-1 group-focus-visible:ring-secondary shadow-inner hover:shadow-[0_0_15px_rgba(211,156,118,0.15)] flex items-center justify-center">
                <CameraIcon className="w-4 h-4" />
              </div>
              <span className="font-bold text-[8px] uppercase tracking-widest text-text-muted/70 group-hover:text-text-main transition-colors">Tirar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;