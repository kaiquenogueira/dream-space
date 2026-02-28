import { useState, useEffect, useCallback, useRef } from 'react';
import type React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Property, UploadedImage } from '../types';
import { 
  usePropertiesQuery, 
  useCreatePropertyMutation, 
  KEYS 
} from './useProjectQuery';
import { 
  deleteImageAssets, 
  uploadOriginalImages 
} from '../services/projectService';

const MAX_IMAGES = 10;

export const useProject = (userId?: string | null) => {
  const queryClient = useQueryClient();
  const { data: properties = [] } = usePropertiesQuery(userId);
  const createPropertyMutation = useCreatePropertyMutation(userId);

  // UI State (Local)
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const isInitialized = useRef(false);

  // Derived State
  const activeProperty = properties.find(p => p.id === activePropertyId);
  const images = activeProperty ? activeProperty.images : [];

  // Auto-selection Effects
  useEffect(() => {
    // Only auto-select on first load if we have properties
    if (!isInitialized.current && properties.length > 0) {
      if (!activePropertyId) {
        setActivePropertyId(properties[0].id);
      }
      isInitialized.current = true;
    }

    // Fallback if active property is deleted
    if (activePropertyId && properties.length > 0) {
       const exists = properties.find(p => p.id === activePropertyId);
       if (!exists) {
           setActivePropertyId(properties[0].id);
       }
    }
  }, [properties, activePropertyId]);

  useEffect(() => {
    // Se não tem imagem selecionada, seleciona a primeira
    if (!selectedImageId && images.length > 0) {
      setSelectedImageId(images[0].id);
    }
    // Se a imagem selecionada não existe mais na lista atual, reseta
    else if (selectedImageId && !images.find(img => img.id === selectedImageId)) {
      setSelectedImageId(images.length > 0 ? images[0].id : null);
    }
  }, [images, selectedImageId]);


  // --- Compatibility Shims for setProperties/setImages ---
  // These allow us to keep the existing component API while updating the React Query cache
  
  const setProperties = useCallback((action: React.SetStateAction<Property[]>) => {
    queryClient.setQueryData<Property[]>(KEYS.properties(userId), (old) => {
      const current = old || [];
      return typeof action === 'function' ? action(current) : action;
    });
  }, [queryClient, userId]);

  const setImages = useCallback((action: React.SetStateAction<UploadedImage[]>) => {
    if (!activePropertyId) return;

    queryClient.setQueryData<Property[]>(KEYS.properties(userId), (oldProperties) => {
      if (!oldProperties) return [];
      
      return oldProperties.map(prop => {
        if (prop.id !== activePropertyId) return prop;

        const currentImages = prop.images;
        const newImages = typeof action === 'function' 
          ? (action as (prev: UploadedImage[]) => UploadedImage[])(currentImages)
          : action;
        
        return { ...prop, images: newImages };
      });
    });
  }, [queryClient, userId, activePropertyId]);


  // --- Handlers ---

  const handleCreateProperty = async (e: React.FormEvent, name: string) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newProp = await createPropertyMutation.mutateAsync(name);
      setActivePropertyId(newProp.id);
    } catch (error) {
      console.error("Failed to create property:", error);
    }
  };

  const handleImagesSelected = async (newImages: UploadedImage[]) => {
    // Ensure all new images have selected: true
    const withSelection = newImages.map(img => ({ ...img, selected: true }));
    
    // Optimistic Update
    setImages(prev => {
      const combined = [...prev, ...withSelection];
      if (combined.length > MAX_IMAGES) {
        return combined.slice(0, MAX_IMAGES);
      }
      return combined;
    });

    if (!selectedImageId && newImages.length > 0) {
      setSelectedImageId(newImages[0].id);
    }

    // Actual Upload
    try {
      const uploadResults = await uploadOriginalImages({
        userId,
        activePropertyId,
        images: newImages
      });

      if (uploadResults.length === 0) return;

      // Update with server results (paths, errors)
      setImages(prev => prev.map(img => {
        const result = uploadResults.find(entry => entry.id === img.id);
        if (!result) return img;
        if (result.error) {
          return { ...img, error: result.error };
        }
        if (result.originalPath) {
          return { ...img, originalPath: result.originalPath, error: undefined };
        }
        return img;
      }));
    } catch (error) {
      console.error("Failed to upload images:", error);
    }
  };

  const removeImage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const imageToRemove = images.find(img => img.id === id);
    
    // Optimistic Update
    setImages(prev => prev.filter(img => img.id !== id));
    
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }

    if (!userId || !imageToRemove) return;

    try {
      await deleteImageAssets({ userId, image: imageToRemove });
    } catch (error) {
      console.error("Failed to delete image resources:", error);
      // Could revert here if needed, but for deletion usually not worth the UX flicker
    }
  };

  const toggleImageSelection = (id: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, selected: !img.selected } : img
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = images.every(img => img.selected);
    setImages(prev => prev.map(img => ({ ...img, selected: !allSelected })));
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
    toggleImageSelection,
    toggleSelectAll,
    MAX_IMAGES
  };
};
