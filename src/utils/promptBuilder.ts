import { GenerationMode, ArchitecturalStyle, STYLE_PROMPTS } from '../types';

export interface PromptOptions {
    generationMode: GenerationMode;
    selectedStyle: ArchitecturalStyle | null;
    customPrompt: string;
}

export const buildPrompt = ({
    generationMode,
    selectedStyle,
    customPrompt,
}: PromptOptions): string => {
    const baseAnalysis = "CRITICAL RULES FOR GENERATION: 1. DO NOT change, move, remove, or alter the location or shape of existing doors and windows under any circumstances. 2. Automatically analyze the environment before furnishing: if it is a more enclosed space, generate a bedroom; if it is a more open space with multiple accesses, generate a living room; if the structural layout clearly allows or indicates plumbing, generate a kitchen. 3. Maintain the exact original walls, floor, and ceiling structures.";

    let finalPrompt = '';

    if (generationMode === GenerationMode.VIRTUAL_STAGING) {
        if (selectedStyle) {
            finalPrompt = `This is an empty room. ${baseAnalysis} Furnish this room with ${STYLE_PROMPTS[selectedStyle]} furniture. Add realistic lighting and shadows. Ensure photorealistic quality.`;
        } else {
            finalPrompt = `This is an empty room. ${baseAnalysis} Furnish this room with modern furniture appropriate for its size and layout. Add realistic lighting and shadows. Ensure photorealistic quality.`;
        }
    } else {
        if (selectedStyle) {
            finalPrompt = `Redesign this interior space in a ${STYLE_PROMPTS[selectedStyle]}. ${baseAnalysis} Apply appropriate furniture, lighting, and wall colors. Ensure photorealistic quality.`;
        } else {
            finalPrompt = `Redesign this interior space with modern design. ${baseAnalysis} Apply appropriate furniture, lighting, and wall colors. Ensure photorealistic quality.`;
        }
    }

    if (customPrompt) {
        finalPrompt += ` ADDITIONAL USER REQUEST: ${customPrompt}`;
    }

    return finalPrompt;
};
