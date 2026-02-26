import { useState, useEffect } from 'react';
import type React from 'react';
import { Property, UploadedImage } from '../types';
import {
  createPropertyRecord,
  deleteImageAssets,
  hydrateStoredProjects,
  loadRemoteProjects,
  persistProjects,
  clearPersistedProjects,
  uploadOriginalImages
} from '../services/projectService';

const MAX_IMAGES = 5;

export const useProject = (userId?: string | null) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const activeProperty = properties.find(p => p.id === activePropertyId);
  const images = activeProperty ? activeProperty.images : [];

  useEffect(() => {
    if (!selectedImageId && images.length > 0) {
      setSelectedImageId(images[0].id);
    }
  }, [images, selectedImageId]);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;

    const loadRemote = async () => {
      const mappedProperties = await loadRemoteProjects(userId);

      if (isActive) {
        setProperties(mappedProperties);
        if (!activePropertyId && mappedProperties.length > 0) {
          setActivePropertyId(mappedProperties[0].id);
        }
        if (!selectedImageId && mappedProperties[0]?.images?.length) {
          setSelectedImageId(mappedProperties[0].images[0].id);
        }
      }
    };

    loadRemote();

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    const stored = hydrateStoredProjects(userId);
    if (!stored) return;
    setProperties(stored.properties);
    setActivePropertyId(stored.activePropertyId ?? null);
    setSelectedImageId(stored.selectedImageId ?? null);
  }, [userId]);

  useEffect(() => {
    persistProjects(properties, activePropertyId, selectedImageId, userId);
  }, [properties, activePropertyId, selectedImageId, userId]);

  useEffect(() => {
    if (!userId) {
      clearPersistedProjects();
    }
  }, [userId]);

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

  const handleCreateProperty = async (e: React.FormEvent, name: string) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProp = await createPropertyRecord(userId, name);
    setProperties(prev => [...prev, newProp]);
    setActivePropertyId(newProp.id);
  };

  const handleImagesSelected = async (newImages: UploadedImage[]) => {
    // Ensure all new images have selected: true
    const withSelection = newImages.map(img => ({ ...img, selected: true }));
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

    const uploadResults = await uploadOriginalImages({
      userId,
      activePropertyId,
      images: newImages
    });

    if (uploadResults.length === 0) return;

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
  };

  const removeImage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const imageToRemove = images.find(img => img.id === id);
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImageId === id) {
      setSelectedImageId(null);
    }

    if (!userId || !imageToRemove) return;

    try {
      await deleteImageAssets({ userId, image: imageToRemove });
    } catch (error) {
      console.error("Failed to delete image resources:", error);
      // Optionally revert UI state here if critical
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
