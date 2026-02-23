import { supabase } from '../lib/supabase';

export const generateRoomDesign = async (
  imageBase64: string,
  prompt: string,
  propertyId?: string,
  style?: string,
  generationMode?: string,
): Promise<{ result: string; credits_remaining: number; is_compressed: boolean }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Não autenticado. Por favor, faça login.');
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        imageBase64,
        prompt,
        propertyId,
        style,
        generationMode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
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
    };
  } catch (error) {
    console.error("Generation API Error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateDroneTourScript = async (
  imageUrl: string,
  includeVideo: boolean = true
): Promise<{ script: string; videoOperationName?: string; credits_remaining: number }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Não autenticado. Por favor, faça login.');
    }

    const response = await fetch('/api/generate-drone-tour', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imageUrl, includeVideo }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Falha ao gerar o script do tour');
    }

    const data = await response.json();
    return {
      script: data.script,
      videoOperationName: data.videoOperationName,
      credits_remaining: data.credits_remaining,
    };
  } catch (error) {
    console.error("Drone Tour Script API Error:", error);
    throw error;
  }
};
