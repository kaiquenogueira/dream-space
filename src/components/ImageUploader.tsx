import React, { useRef } from 'react';
import { UploadIcon } from './Icons';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  onImagesSelected: (images: UploadedImage[]) => void;
  currentCount: number;
  maxImages: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected, currentCount, maxImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLimitReached = currentCount >= maxImages;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files) as File[];
      
      // Check remaining slots
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
            base64: base64Content
          });
        } catch (e) {
          console.error("Error reading file", e);
        }
      }
      onImagesSelected(processedImages);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLimitReached) {
     return (
        <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 cursor-not-allowed">
            <p className="font-medium text-sm">Limit Reached</p>
            <p className="text-xs opacity-70">Remove images to add more</p>
        </div>
     );
  }

  return (
    <div 
      className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors cursor-pointer bg-slate-800/50"
      onClick={() => !isLimitReached && fileInputRef.current?.click()}
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
      <div className="bg-slate-700 p-3 rounded-full mb-3">
        <UploadIcon />
      </div>
      <p className="font-medium text-sm">Add Photos</p>
      <p className="text-xs opacity-70 mt-1">{currentCount}/{maxImages} uploaded</p>
    </div>
  );
};

export default ImageUploader;