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
      alert(`You can only upload ${maxImages} images total. Processing first ${remainingSlots}.`);
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
        alert(`Failed to process image ${file.name}. Please try another one.`);
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
      <div className="border-2 border-dashed border-zinc-800/60 rounded-xl h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/20 cursor-not-allowed">
        <ImageIcon className="w-5 h-5 opacity-50 mb-1.5" />
        <p className="font-medium text-xs">Limit Reached</p>
        <p className="text-[10px] opacity-60 mt-0.5">Remove to add more</p>
      </div>
    );
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl h-full min-h-[120px] flex flex-col items-center justify-center transition-all duration-300
        ${isDragging
          ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]'
          : 'border-zinc-700/60 hover:border-emerald-500/50 bg-zinc-800/30 hover:bg-emerald-500/5'
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
        <div className="flex flex-col items-center">
          <div className="p-2.5 rounded-full mb-2 bg-emerald-500/20 text-emerald-400 scale-110 transition-all duration-300">
            <PlusIcon className="w-5 h-5" />
          </div>
          <p className="font-medium text-xs text-emerald-300">Drop here</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full py-2">
          <div className="flex items-center gap-6 mb-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); !isLimitReached && fileInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 group outline-none"
            >
              <div className="p-3 rounded-full bg-zinc-700/50 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-emerald-500">
                <UploadIcon className="w-5 h-5" />
              </div>
              <span className="font-medium text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Upload</span>
            </button>

            <div className="w-px h-10 bg-zinc-700/50"></div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); !isLimitReached && cameraInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 group outline-none"
            >
              <div className="p-3 rounded-full bg-zinc-700/50 text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/20 transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-emerald-500">
                <CameraIcon className="w-5 h-5" />
              </div>
              <span className="font-medium text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Camera</span>
            </button>
          </div>
          <p className="text-[10px] text-zinc-500">{currentCount}/{maxImages}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;