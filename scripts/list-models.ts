import { GoogleGenAI } from "@google/genai";

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Please set GEMINI_API_KEY env var");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log("Listing models...");
    // The SDK structure for listModels might vary. 
    // Based on documentation it's usually via the models client.
    const response = await ai.models.list();
    
    console.log("Available models:");
    for await (const model of response) {
      const supportedMethods =
        (model as any).supportedGenerationMethods ??
        (model as any).supported_methods ??
        'n/a';
      console.log(`- ${model.name} (Supported methods: ${supportedMethods})`);
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
