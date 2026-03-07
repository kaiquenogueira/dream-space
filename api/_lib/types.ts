import type { IncomingMessage, ServerResponse } from 'http';

// Vercel Serverless Function Types
export interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
}

export interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
}

// API Request/Response Types

export interface ErrorResponse {
  error: string;
  message?: string;
  credits_remaining?: number;
  plan?: string;
}

export interface GenerateImageRequest {
  imageBase64: string;
  customPrompt?: string; // New field
  prompt?: string; // Legacy field
  propertyId?: string;
  style?: string;
  generationMode?: string;
}

export interface GenerateImageResponse {
  result: string;
  credits_remaining: number;
  is_compressed: boolean;
  storage_path?: string;
}

export interface GenerateDroneTourRequest {
  imageUrl: string;
  includeVideo?: boolean;
  customPrompt?: string; // New field for prompt customization
}

export interface GenerateDroneTourResponse {
  videoOperationName: string;
  credits_remaining?: number;
}

export interface CheckOperationResponse {
  name: string;
  done: boolean;
  error?: {
    code: number;
    message: string;
  };
  response?: {
    generatedVideos?: Array<{
      video?: {
        uri: string;
      };
      videoUri?: string;
    }>;
  };
  publicVideoUrl?: string; // Injected by our proxy
}
