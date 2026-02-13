export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  generatedUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

export interface GenerationResult {
  originalImageId: string;
  generatedImageUrl: string;
  promptUsed: string;
  timestamp: number;
}

export enum ArchitecturalStyle {
  MODERN = 'Modern',
  SCANDINAVIAN = 'Scandinavian',
  INDUSTRIAL = 'Industrial',
  BOHEMIAN = 'Bohemian',
  MINIMALIST = 'Minimalist',
  MID_CENTURY = 'Mid-Century Modern',
  COASTAL = 'Coastal',
  FARMHOUSE = 'Farmhouse'
}

export const STYLE_PROMPTS: Record<ArchitecturalStyle, string> = {
  [ArchitecturalStyle.MODERN]: "sleek modern style with neutral tones, clean lines, and contemporary furniture",
  [ArchitecturalStyle.SCANDINAVIAN]: "scandinavian style with bright white walls, wooden accents, cozy textiles, and functional furniture",
  [ArchitecturalStyle.INDUSTRIAL]: "industrial loft style with exposed textures, leather furniture, metal accents, and raw finishes",
  [ArchitecturalStyle.BOHEMIAN]: "bohemian style with eclectic patterns, vibrant colors, many plants, and layered textures",
  [ArchitecturalStyle.MINIMALIST]: "ultra-minimalist style with decluttered spaces, monochromatic color palette, and essential furniture only",
  [ArchitecturalStyle.MID_CENTURY]: "mid-century modern style with organic curves, teak wood furniture, and retro color accents",
  [ArchitecturalStyle.COASTAL]: "breezy coastal style with light blues, whites, natural fibers, and an airy atmosphere",
  [ArchitecturalStyle.FARMHOUSE]: "modern farmhouse style with rustic wood beams, white shiplap walls, and comfortable traditional furniture"
};