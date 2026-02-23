export enum GenerationMode {
  REDESIGN = 'Redesign',
  VIRTUAL_STAGING = 'Virtual Staging (Mobiliar)'
}

export interface Property {
  id: string;
  name: string;
  images: UploadedImage[];
  createdAt: number;
  logo?: string; // Base64 or URL
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  generatedUrl?: string;
  isGenerating?: boolean;
  error?: string;
  selected: boolean;
  generationMode?: GenerationMode; // Optional per image override or global
}

export interface GenerationResult {
  originalImageId: string;
  generatedImageUrl: string;
  promptUsed: string;
  timestamp: number;
}

export enum ArchitecturalStyle {
  MODERN = 'Moderno',
  SCANDINAVIAN = 'Escandinavo',
  INDUSTRIAL = 'Industrial',
  BOHEMIAN = 'Boêmio',
  MINIMALIST = 'Minimalista',
  MID_CENTURY = 'Moderno de Meados do Século',
  COASTAL = 'Costeiro',
  FARMHOUSE = 'Casa de Fazenda'
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