import { supabase } from '../lib/supabase';

export const generateRoomDesign = async (
  imageBase64: string,
  customPrompt: string,
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
): Promise<{ videoOperationName?: string; credits_remaining: number }> => {
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
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || errorData.error || 'Falha ao gerar o tour');
      } catch (e) {
        throw new Error(`Server Error: ${errorText || response.statusText}`);
      }
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
