import { supabase } from '../lib/supabase';

const getApiUrl = (path: string) => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return path;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const generateRoomDesign = async (
  imageBase64: string,
  customPrompt: string,
  propertyId?: string,
  style?: string,
  generationMode?: string,
): Promise<{ result: string; credits_remaining: number; is_compressed: boolean; storage_path?: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Não autenticado. Por favor, faça login.');
    }

    const response = await fetch(getApiUrl('/api/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        imageBase64,
        customPrompt, // Send raw user input
        propertyId,
        style,
        generationMode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Handle non-JSON response (e.g. 500 from Vercel)
        throw new Error(`Server Error: ${errorText || response.statusText}`);
      }

      if (response.status === 403) {
        throw new Error(errorData.message || 'Sem créditos restantes. Por favor, atualize seu plano.');
      }
      throw new Error(errorData.error || 'Falha ao gerar o design');
    }

    const data = await response.json();
    return {
      result: data.result,
      credits_remaining: data.credits_remaining,
      is_compressed: data.is_compressed ?? false,
      storage_path: data.storage_path,
    };
  } catch (error) {
    console.error("Generation API Error:", error);
    throw error;
  }
};

export const generateDroneTourScript = async (
  imageUrl: string,
  includeVideo: boolean = true,
  customPrompt?: string
): Promise<{ videoOperationName?: string; credits_remaining: number }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Não autenticado. Por favor, faça login.');
    }

    const response = await fetch(getApiUrl('/api/generate-drone-tour'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imageUrl, includeVideo, customPrompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`Server Error: ${errorText || response.statusText}`);
      }
      throw new Error(errorData.message || errorData.error || 'Falha ao gerar o tour');
    }

    const data = await response.json();
    return {
      videoOperationName: data.videoOperationName,
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    console.error("Drone Tour API Error:", error);
    throw error;
  }
};

export const updateGeneratedImageMetadata = async ({
  imageId,
  storagePath,
  generationMode,
  style,
  isCompressed,
}: {
  imageId: string;
  storagePath?: string;
  generationMode: string;
  style: string | null;
  isCompressed?: boolean;
}) => {
  if (!storagePath) return;
  await supabase
    .from('property_images')
    .update({
      generated_image_path: storagePath,
      generation_mode: generationMode,
      style,
      is_compressed: isCompressed ?? false
    })
    .eq('id', imageId);
};
