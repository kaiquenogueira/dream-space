import React, { useState, useEffect } from 'react';
import { Property, UploadedImage } from '../types';

const MAX_IMAGES = 5;

export const useProject = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const activeProperty = properties.find(p => p.id === activePropertyId);
  const images = activeProperty ? activeProperty.images : [];

  useEffect(() => {
    // If no image is selected but we have some, select the first one
    if (!selectedImageId && images.length > 0) {
      setSelectedImageId(images[0].id);
    }
  }, [images, selectedImageId]);

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

  const handleCreateProperty = (e: React.FormEvent, name: string) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const newProp: Property = {
      id: crypto.randomUUID(),
      name: name,
      images: [],
      createdAt: Date.now()
    };
    setProperties(prev => [...prev, newProp]);
    setActivePropertyId(newProp.id);
  };

  const handleImagesSelected = (newImages: UploadedImage[]) => {
    setImages(prev => {
      const combined = [...prev, ...newImages];
      if (combined.length > MAX_IMAGES) {
        return combined.slice(0, MAX_IMAGES);
      }
      return combined;
    });
    
    if (!selectedImageId && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }
  };

  return {
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
  };
};
