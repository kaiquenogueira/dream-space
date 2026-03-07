export enum GenerationMode {
    VIRTUAL_STAGING = 'Virtual Staging (Mobiliar)',
    PAINT_ONLY = 'Paint Only (Apenas Pintura)'
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

export const STYLE_PROMPTS: Record<string, string> = {
    [ArchitecturalStyle.MODERN]: "sleek modern style with neutral tones, clean lines, and contemporary furniture",
    [ArchitecturalStyle.SCANDINAVIAN]: "scandinavian style with bright white walls, wooden accents, cozy textiles, and functional furniture",
    [ArchitecturalStyle.INDUSTRIAL]: "industrial loft style with exposed textures, leather furniture, metal accents, and raw finishes",
    [ArchitecturalStyle.BOHEMIAN]: "bohemian style with eclectic patterns, vibrant colors, many plants, and layered textures",
    [ArchitecturalStyle.MINIMALIST]: "ultra-minimalist style with decluttered spaces, monochromatic color palette, and essential furniture only",
    [ArchitecturalStyle.MID_CENTURY]: "mid-century modern style with organic curves, teak wood furniture, and retro color accents",
    [ArchitecturalStyle.COASTAL]: "breezy coastal style with light blues, whites, natural fibers, and an airy atmosphere",
    [ArchitecturalStyle.FARMHOUSE]: "modern farmhouse style with rustic wood beams, white shiplap walls, and comfortable traditional furniture"
};

export interface PromptOptions {
    generationMode: string;
    selectedStyle: string | null;
    customPrompt: string;
    isIteration?: boolean;
}

function sanitizeInput(input: string): string {
    // Basic sanitization to prevent control characters and obvious injection attempts
    // Remove null bytes and other control chars
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, "");

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, " ").trim();

    return sanitized;
}

export const buildPrompt = ({
    generationMode,
    selectedStyle,
    customPrompt,
    isIteration,
}: PromptOptions): string => {
    // Enhanced base analysis with stricter rules for structural preservation
    const structuralRules = `
    CRITICAL STRUCTURAL PRESERVATION RULES (MANDATORY):
    1. ABSOLUTELY FORBIDDEN to move, resize, remove, or alter any existing walls, windows, doors, ceilings, or structural openings.
    2. The geometry of the room and general layout MUST remain exactly the same.
    3. Maintain the exact perspective, camera angle, and field of view of the original image.
    4. Keep the original ceiling height, beam structures, and floor plan layout intact.
    5. Structural integrity is PARAMOUNT; do not hallucinate new exits or close existing ones.
    `;

    const environmentalAnalysis = `
    ENVIRONMENT ANALYSIS & CONTEXT:
    1. Analyze the room's structural cues:
       - If plumbing/tiling is visible -> It is a Kitchen or Bathroom.
       - If it's a large open space with multiple entry points -> It is a Living/Dining area.
       - If it's an enclosed private room -> It is a Bedroom or Office.
    2. Preserve natural light sources and direction from the original windows.
    `;

    let finalPrompt = '';

    // ── ITERATION MODE: dedicated prompt, no mode-specific instructions ──
    if (isIteration) {
        finalPrompt = `
        Edit this image. TASK: Incremental Edit on Previously Generated Image.
        This image has ALREADY been edited in a previous generation step. Treat the input image as the NEW BASELINE.
        ${structuralRules}

        CRITICAL ITERATION RULES:
        1. PRESERVE EVERYTHING in this image exactly as it is — walls, paint colors, furniture, flooring, decor, lighting, and all prior modifications.
        2. Make ONLY the specific changes described in the user requirements below. NOTHING ELSE.
        3. Do NOT add, remove, or rearrange any furniture or decor UNLESS the user explicitly asks for it.
        4. Do NOT change wall colors, flooring, or any surface UNLESS the user explicitly asks for it.
        5. If the user asks to change the floor, change ONLY the floor. If the user asks to add a sofa, add ONLY a sofa.
        6. The result must be photorealistic, high-resolution architectural visualization.
        7. OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;

        if (customPrompt) {
            const sanitizedCustom = sanitizeInput(customPrompt);
            finalPrompt += `\nUSER REQUESTED CHANGE (apply ONLY this, preserve everything else): <user_instruction>${sanitizedCustom}</user_instruction>`;
        }

        return finalPrompt.replace(/\s+/g, ' ').trim();
    }

    // ── FIRST GENERATION: use full mode-specific prompts ──
    // Use the style prompt map, fallback to modern if not found or if style is null
    const styleInstruction = (selectedStyle && STYLE_PROMPTS[selectedStyle])
        ? STYLE_PROMPTS[selectedStyle]
        : 'modern and elegant design';

    if (generationMode === GenerationMode.VIRTUAL_STAGING) {
        // Virtual Staging: Only add furniture/decor to empty spaces
        finalPrompt = `
        Edit this image. TASK: Virtual Staging (Furnish Empty Room).
        The attached image is the ORIGINAL ROOM — treat it as the absolute source of truth for all structural elements.
        ${structuralRules}
        ${environmentalAnalysis}
        
        INSTRUCTIONS:
        - Detect the room type based on the structure and furnish it accordingly using a ${styleInstruction}.
        - The room is currently empty or sparse; fill it with realistic furniture, rugs, curtains, and decor.
        - DO NOT change the flooring material or wall paint unless explicitly asked.
        - Ensure all added furniture casts realistic shadows and matches the lighting of the room.
        - The result must be photorealistic, high-resolution architectural visualization.
        - OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;
    } else if (generationMode === GenerationMode.PAINT_ONLY) {
        // Paint Only: Focus on wall painting, no furniture changes
        finalPrompt = `
        Edit this image. TASK: Wall Painting Only (No Furniture Changes).
        The attached image is the ORIGINAL ROOM — treat it as the absolute source of truth for all structural elements.
        ${structuralRules}
        ${environmentalAnalysis}
        
        INSTRUCTIONS:
        - Your ONLY task is to change the wall paint color/texture.
        - If a style is provided (${styleInstruction}), interpret it as a color palette/texture guide for the walls.
        - DO NOT ADD, REMOVE, OR CHANGE ANY FURNITURE.
        - DO NOT CHANGE FLOORING OR CEILING (unless specifically asked in custom prompt).
        - Existing furniture must remain exactly where it is, with the same design.
        - Focus purely on the wall surfaces.
        - The result must be photorealistic.
        - OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;
    } else {
        // Default fallback: Virtual Staging
        finalPrompt = `
        Edit this image. TASK: Virtual Staging (Furnish Empty Room).
        The attached image is the ORIGINAL ROOM — treat it as the absolute source of truth for all structural elements.
        ${structuralRules}
        ${environmentalAnalysis}
        
        INSTRUCTIONS:
        - Detect the room type based on the structure and furnish it accordingly using a ${styleInstruction}.
        - The room is currently empty or sparse; fill it with realistic furniture, rugs, curtains, and decor.
        - DO NOT change the flooring material or wall paint unless explicitly asked.
        - Ensure all added furniture casts realistic shadows and matches the lighting of the room.
        - The result must be photorealistic, high-resolution architectural visualization.
        - OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;
    }

    if (customPrompt) {
        const sanitizedCustom = sanitizeInput(customPrompt);
        // Using explicit delimiters for user content
        finalPrompt += `\nADDITIONAL USER REQUIREMENTS (Prioritize this instruction while strictly adhering to structural rules): <user_instruction>${sanitizedCustom}</user_instruction>`;
    }

    // Clean up extra whitespace and return
    return finalPrompt.replace(/\s+/g, ' ').trim();
};
