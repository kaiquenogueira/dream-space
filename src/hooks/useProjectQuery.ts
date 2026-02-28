import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  loadRemoteProjects, 
  createPropertyRecord, 
  uploadOriginalImages, 
  deleteImageAssets 
} from '../services/projectService';
import type { Property, UploadedImage } from '../types';

export const KEYS = {
  properties: (userId?: string | null) => ['properties', userId],
};

export const usePropertiesQuery = (userId?: string | null) => {
  return useQuery({
    queryKey: KEYS.properties(userId),
    queryFn: () => loadRemoteProjects(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useCreatePropertyMutation = (userId?: string | null) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (name: string) => createPropertyRecord(userId, name),
    onSuccess: (newProperty) => {
      queryClient.setQueryData<Property[]>(KEYS.properties(userId), (old) => {
        return old ? [newProperty, ...old] : [newProperty];
      });
    },
  });
};

export const useUploadImagesMutation = (userId?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activePropertyId, images }: { activePropertyId: string, images: UploadedImage[] }) => {
      return uploadOriginalImages({ userId, activePropertyId, images });
    },
    onSuccess: (results, variables) => {
      if (!results || results.length === 0) return;

      queryClient.setQueryData<Property[]>(KEYS.properties(userId), (oldProperties) => {
        if (!oldProperties) return [];
        
        return oldProperties.map(prop => {
          if (prop.id !== variables.activePropertyId) return prop;

          // Update images with results from upload (e.g. originalPath)
          const updatedImages = prop.images.map(img => {
            const result = results.find(r => r.id === img.id);
            if (!result) return img;
            
            if (result.error) {
              return { ...img, error: result.error };
            }
            if (result.originalPath) {
              return { ...img, originalPath: result.originalPath, error: undefined };
            }
            return img;
          });

          // Add any new images that were just uploaded but not yet in the list (if applicable)
          // Ideally, the UI adds them optimistically, and this confirms them.
          // For now, we assume the UI state is handled by the optimistic update wrapper in useProject
          return { ...prop, images: updatedImages };
        });
      });
    },
  });
};

export const useDeleteImageMutation = (userId?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: UploadedImage) => {
      return deleteImageAssets({ userId, image });
    },
    onMutate: async (imageToRemove) => {
      // Snapshot previous value
      const previousProperties = queryClient.getQueryData<Property[]>(KEYS.properties(userId));

      // Optimistically update
      queryClient.setQueryData<Property[]>(KEYS.properties(userId), (old) => {
        if (!old) return [];
        return old.map(prop => ({
          ...prop,
          images: prop.images.filter(img => img.id !== imageToRemove.id)
        }));
      });

      return { previousProperties };
    },
    onError: (err, newTodo, context) => {
      // Rollback
      if (context?.previousProperties) {
        queryClient.setQueryData(KEYS.properties(userId), context.previousProperties);
      }
    },
  });
};
