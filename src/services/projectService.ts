import { supabase } from '../lib/supabase';
import { GenerationMode } from '../types';
import type { Property, UploadedImage } from '../types';

const STORAGE_KEY_PREFIX = 'dreamspace.projects.v1';
const ORIGINALS_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET_ORIGINALS || 'originals';
const GENERATIONS_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET_GENERATIONS || 'generations';

type StoredProjects = {
  properties: Property[];
  activePropertyId: string | null;
  selectedImageId: string | null;
};

const createSignedUrl = async (bucket: string, path?: string | null) => {
  if (!path) return undefined;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl;
};

const normalizeGenerationMode = (mode?: string | null) => {
  if (mode === GenerationMode.REDESIGN) return GenerationMode.REDESIGN;
  if (mode === GenerationMode.VIRTUAL_STAGING) return GenerationMode.VIRTUAL_STAGING;
  return undefined;
};

const mapPropertyImages = async (rows: Array<{
  id: string;
  property_id: string;
  original_image_path?: string | null;
  generated_image_path?: string | null;
  video_operation_name?: string | null;
  video_url?: string | null;
  generation_mode?: string | null;
}>) => {
  const imagesByProperty = new Map<string, UploadedImage[]>();
  await Promise.all(rows.map(async (row) => {
    const originalUrl = await createSignedUrl(ORIGINALS_BUCKET, row.original_image_path);
    const generatedUrl = await createSignedUrl(GENERATIONS_BUCKET, row.generated_image_path);

    const image: UploadedImage = {
      id: row.id,
      file: null,
      previewUrl: originalUrl || '',
      base64: '',
      originalPath: row.original_image_path ?? undefined,
      generatedPath: row.generated_image_path ?? undefined,
      generatedUrl: generatedUrl,
      videoUrl: row.video_url ?? undefined,
      videoOperationName: row.video_operation_name ?? undefined,
      selected: true,
      generationMode: normalizeGenerationMode(row.generation_mode),
      isGenerating: false
    };

    const list = imagesByProperty.get(row.property_id) || [];
    list.push(image);
    imagesByProperty.set(row.property_id, list);
  }));
  return imagesByProperty;
};

const sanitizeStoredProperties = (stored: StoredProjects) => {
  const hydratedProperties = stored.properties.map((property) => ({
    ...property,
    images: (property.images || [])
      .filter((img) => {
        if (img.previewUrl && img.previewUrl.includes('.supabase.co') && !img.previewUrl.includes('/sign/') && !img.previewUrl.includes('/public/')) {
          return false;
        }
        return true;
      })
      .map((image) => ({
        ...image,
        file: null,
        selected: image.selected ?? true,
        isGenerating: image.isGenerating ?? false
      }))
  }));

  return {
    properties: hydratedProperties,
    activePropertyId: stored.activePropertyId ?? null,
    selectedImageId: stored.selectedImageId ?? null
  };
};

const getUploadErrorMessage = (message?: string) => {
  if (!message) return 'Falha ao enviar a imagem para o storage.';
  const normalized = message.toLowerCase();
  if (normalized.includes('bucket')) {
    return 'Bucket de storage não encontrado. Verifique se os buckets "originals" e "generations" existem no Supabase.';
  }
  if (normalized.includes('row-level security') || normalized.includes('violates row-level security')) {
    return 'Upload bloqueado por RLS do storage. Verifique as policies de INSERT/SELECT em storage.objects para o bucket "originals".';
  }
  if (normalized.includes('permission') || normalized.includes('policy')) {
    return 'Permissão negada no storage. Verifique as policies de storage.objects no Supabase.';
  }
  return message;
};

const getStorageKey = (userId?: string | null) => (
  userId ? `${STORAGE_KEY_PREFIX}.${userId}` : STORAGE_KEY_PREFIX
);

export const hydrateStoredProjects = (userId?: string | null): StoredProjects | null => {
  const stored = localStorage.getItem(getStorageKey(userId));
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.properties)) return null;
    return sanitizeStoredProperties({
      properties: parsed.properties,
      activePropertyId: parsed.activePropertyId ?? null,
      selectedImageId: parsed.selectedImageId ?? null
    });
  } catch (error) {
    localStorage.removeItem(getStorageKey(userId));
    return null;
  }
};

export const persistProjects = (
  properties: Property[],
  activePropertyId: string | null,
  selectedImageId: string | null,
  userId?: string | null
) => {
  const serializableProperties = properties.map(property => ({
    ...property,
    images: property.images.map(image => ({
      ...image,
      file: null,
      base64: ''
    }))
  }));
  localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({
      properties: serializableProperties,
      activePropertyId,
      selectedImageId
    })
  );
};

export const clearPersistedProjects = (userId?: string | null) => {
  localStorage.removeItem(getStorageKey(userId));
};

export const loadRemoteProjects = async (userId: string): Promise<Property[]> => {
  const { data: propertyRows, error: propertyError } = await supabase
    .from('properties')
    .select('id, name, logo_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (propertyError || !propertyRows) return [];

  const { data: imageRows } = await supabase
    .from('property_images')
    .select('id, property_id, original_image_path, generated_image_path, video_operation_name, video_url, style, generation_mode, is_compressed, created_at')
    .eq('user_id', userId);

  const imagesByProperty = imageRows && imageRows.length > 0
    ? await mapPropertyImages(imageRows)
    : new Map<string, UploadedImage[]>();

  return propertyRows.map((property) => ({
    id: property.id,
    name: property.name,
    logo: property.logo_url ?? undefined,
    createdAt: new Date(property.created_at).getTime(),
    images: imagesByProperty.get(property.id) || []
  }));
};

export const createPropertyRecord = async (userId: string | null | undefined, name: string): Promise<Property> => {
  if (userId) {
    const { data, error } = await supabase
      .from('properties')
      .insert({ user_id: userId, name })
      .select('id, name, logo_url, created_at')
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        images: [],
        createdAt: new Date(data.created_at).getTime(),
        logo: data.logo_url ?? undefined
      };
    }
  }

  return {
    id: crypto.randomUUID(),
    name,
    images: [],
    createdAt: Date.now()
  };
};

export const uploadOriginalImages = async ({
  userId,
  activePropertyId,
  images
}: {
  userId: string | null | undefined;
  activePropertyId: string | null;
  images: UploadedImage[];
}) => {
  if (!userId || !activePropertyId) return [];

  return await Promise.all(images.map(async (image) => {
    if (!image.file) return { id: image.id };
    const extension = image.file.type?.split('/')[1] || 'jpg';
    const storagePath = `${userId}/${activePropertyId}/${image.id}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(ORIGINALS_BUCKET)
      .upload(storagePath, image.file, {
        contentType: image.file.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      const message = getUploadErrorMessage(uploadError.message);
      return { id: image.id, error: message };
    }

    await supabase
      .from('property_images')
      .upsert({
        id: image.id,
        user_id: userId,
        property_id: activePropertyId,
        original_image_path: storagePath,
        updated_at: new Date().toISOString()
      });

    return { id: image.id, originalPath: storagePath };
  }));
};

export const deleteImageAssets = async ({
  userId,
  image
}: {
  userId: string | null | undefined;
  image: UploadedImage;
}) => {
  if (!userId) return;
  await supabase.from('property_images').delete().eq('id', image.id);

  const deletePromises: Promise<unknown>[] = [];
  if (image.originalPath) {
    deletePromises.push(supabase.storage.from(ORIGINALS_BUCKET).remove([image.originalPath]));
  }
  if (image.generatedPath) {
    deletePromises.push(supabase.storage.from(GENERATIONS_BUCKET).remove([image.generatedPath]));
  }
  await Promise.all(deletePromises);
};
