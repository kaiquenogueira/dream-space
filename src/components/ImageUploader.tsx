import React, { useRef, useState } from 'react';
import { UploadIcon, ImageIcon, PlusIcon } from './Icons';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  onImagesSelected: (images: UploadedImage[]) => void;
  currentCount: number;
  maxImages: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, currentCount, maxImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        const result = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });

        const base64Content = result.split(',')[1];

        processedImages.push({
          id: Math.random().toString(36).substring(7),
          file: file,
          previewUrl: result,
          base64: base64Content,
          selected: true
        });
      } catch (e) {
        console.error("Error reading file", e);
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')) as File[];
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
        relative border-2 border-dashed rounded-xl h-full min-h-[120px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300
        ${isDragging
          ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]'
          : 'border-zinc-700/60 hover:border-emerald-500/50 bg-zinc-800/30 hover:bg-emerald-500/5'
        }
      `}
      onClick={() => !isLimitReached && fileInputRef.current?.click()}
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

      <div className={`p-2.5 rounded-full mb-2 transition-all duration-300 ${isDragging ? 'bg-emerald-500/20 text-emerald-400 scale-110' : 'bg-zinc-700/50 text-zinc-400'}`}>
        {isDragging ? <PlusIcon className="w-5 h-5" /> : <UploadIcon className="w-5 h-5" />}
      </div>
      <p className={`font-medium text-xs transition-colors ${isDragging ? 'text-emerald-300' : 'text-zinc-400'}`}>
        {isDragging ? 'Drop here' : 'Add Photos'}
      </p>
      <p className="text-[10px] text-zinc-500 mt-0.5">{currentCount}/{maxImages}</p>
    </div>
  );
};

export default ImageUploader;