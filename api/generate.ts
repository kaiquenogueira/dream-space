import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from './lib/supabaseAdmin';
import { buildPrompt } from './lib/promptBuilder';

export default async function handler(req: any, res: any) {
  const requestSize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
  console.log(`Incoming request size: ${(requestSize / 1024 / 1024).toFixed(2)} MB`);

  // --- Auth Check via Supabase ---
  if (!supabaseAdmin) {
    console.error("Supabase Admin client is not initialized. Check server logs for missing env vars.");
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  let userId: string;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    userId = user.id;
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  // --- Credit Check ---
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('credits_remaining, plan')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }

  if (profile.credits_remaining <= 0) {
    return res.status(403).json({
      error: 'No credits remaining',
      credits_remaining: 0,
      plan: profile.plan,
      message: 'You have used all your credits for this period. Upgrade your plan for more generations.',
    });
  }

  // --- Method Check ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageBase64, customPrompt, prompt: legacyPrompt, propertyId, style, generationMode } = req.body;

  // Use customPrompt (new) or legacyPrompt (old) as user instruction
  const userInstruction = customPrompt || legacyPrompt || "";

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  // Input Validation
  if (userInstruction.length > 1000) {
      return res.status(400).json({ error: 'Prompt too long (max 1000 chars)' });
  }
  
  // Validate imageBase64 size roughly (base64 is ~1.33x binary size)
  // 10MB limit -> ~13.3MB base64 string
  if (imageBase64.length > 14 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 10MB)' });
  }

  // Build the prompt securely on the server
  const finalPrompt = buildPrompt({
      generationMode: generationMode || 'Redesign',
      selectedStyle: style || null,
      customPrompt: userInstruction
  });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Use the latest stable model
    const MODEL_NAME = 'gemini-2.0-flash'; 
    console.log(`Using model: ${MODEL_NAME}`);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: 'image/jpeg',
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
    });

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const generatedBase64 = part.inlineData.data;
          const resultBase64 = `data:image/png;base64,${generatedBase64}`;

          // --- Deduct 1 credit ---
          const { error: creditError } = await supabaseAdmin
            .from('profiles')
            .update({ credits_remaining: profile.credits_remaining - 1 })
            .eq('id', userId);

          if (creditError) {
            console.error("Failed to deduct credit:", creditError);
          }

          // --- Determine storage strategy based on plan ---
          const isPremium = profile.plan !== 'free';
          let generatedImageUrl: string | null = null;
          let isCompressed = false;

          if (isPremium) {
            // Premium: save full-res to Supabase Storage
            try {
              const buffer = Buffer.from(generatedBase64, 'base64');
              const filePath = `${userId}/${Date.now()}.png`;

              const { error: uploadError } = await supabaseAdmin.storage
                .from('generations')
                .upload(filePath, buffer, {
                  contentType: 'image/png',
                  upsert: false,
                });

              if (!uploadError) {
                const { data: urlData } = supabaseAdmin.storage
                  .from('generations')
                  .getPublicUrl(filePath);
                generatedImageUrl = urlData.publicUrl;
              }
            } catch (storageErr) {
              console.error("Storage upload failed (premium):", storageErr);
            }
          } else {
            // Free: save compressed version (lower quality JPEG)
            isCompressed = true;
            try {
              const buffer = Buffer.from(generatedBase64, 'base64');
              const filePath = `${userId}/${Date.now()}_compressed.jpg`;

              // Store as-is for now (compression happens client-side before upload)
              // Mark as compressed for future reference
              const { error: uploadError } = await supabaseAdmin.storage
                .from('generations')
                .upload(filePath, buffer, {
                  contentType: 'image/jpeg',
                  upsert: false,
                });

              if (!uploadError) {
                const { data: urlData } = supabaseAdmin.storage
                  .from('generations')
                  .getPublicUrl(filePath);
                generatedImageUrl = urlData.publicUrl;
              }
            } catch (storageErr) {
              console.error("Storage upload failed (free):", storageErr);
              // Non-blocking: generation still succeeds, just no persistence
            }
          }

          // --- Save generation record to DB ---
          try {
            await supabaseAdmin.from('generations').insert({
              user_id: userId,
              property_id: propertyId || null,
              original_image_url: 'client-side', // originals stay on client for free tier
              generated_image_url: generatedImageUrl || 'not-stored',
              prompt_used: finalPrompt,
              style: style || null,
              generation_mode: generationMode || null,
              is_compressed: isCompressed,
            });
          } catch (dbErr) {
            console.error("Failed to save generation record:", dbErr);
          }

          return res.status(200).json({
            result: resultBase64,
            credits_remaining: profile.credits_remaining - 1,
            is_compressed: isCompressed,
          });
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || 'Failed to generate design' });
  }
}
