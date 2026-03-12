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
    CRITICAL STRUCTURAL PRESERVATION RULES (MANDATORY AND ABSOLUTE):
    0. You are NOT allowed to hallucinate, add, remove, close, or move ANY windows, doors, walls, ceilings, floors, columns, beams, or openings under any circumstance.
    1. The geometry of the room, ceiling height, openings, and floor plan MUST remain EXACTLY the same as the original image.
    2. Maintain the exact perspective, camera angle, and field of view of the original image.
    3. Any existing door must stay a door, any existing window must stay a window. Do not alter their size, position, or count.
    4. You must not add, remove, or reposition architectural elements. Furniture/decor may be added only without changing structure.
    `;

    const environmentalAnalysis = `
    ENVIRONMENT ANALYSIS & CONTEXT:
    1. Analyze the room's structural cues:
       - If plumbing/tiling is visible -> It is a Kitchen or Bathroom.
       - If it's a large open space with multiple entry points -> It is a Living/Dining area.
       - If it's an enclosed private room -> It is a Bedroom or Office.
    2. Preserve natural light sources and direction from the original windows.
    3. Do not infer or add any architectural elements that are not visible in the original image.
    `;

    const styleInstruction = (selectedStyle && STYLE_PROMPTS[selectedStyle])
        ? STYLE_PROMPTS[selectedStyle]
        : 'modern and elegant design';

    let finalPrompt = '';

    // ── ITERATION MODE: dedicated prompt ──
    if (isIteration) {
        finalPrompt = `
        Edit this image. TASK: Incremental Edit on Previously Generated Image.
        This image has ALREADY been edited in a previous generation step. Treat the input image as the NEW BASELINE.
        ${structuralRules}

        CRITICAL ITERATION RULES:
        1. PRESERVE EVERYTHING in this image exactly as it is — walls, paint colors, furniture, flooring, decor, lighting, and all prior modifications.
        2. Make ONLY the specific changes described below. NOTHING ELSE.
        3. Do NOT add, remove, or rearrange any furniture or decor UNLESS explicitly asked for.
        4. Do NOT change wall colors, flooring, or any surface UNLESS explicitly asked for.
        5. If the user asks to change the floor, change ONLY the floor. If the user asks to add a sofa, add ONLY a sofa.
        6. NEVER add, remove, or move windows, doors, walls, or any openings.
        7. The result must be photorealistic, high-resolution architectural visualization.
        8. OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;

        let iterationTask = '';
        
        if (generationMode === GenerationMode.PAINT_ONLY && selectedStyle) {
            iterationTask += `Change the wall paint/texture to match the following style: ${styleInstruction}. Do NOT change furniture or flooring. `;
        } else if (selectedStyle) {
            iterationTask += `Update the overall style to match: ${styleInstruction}. `;
        }

        if (customPrompt) {
            const sanitizedCustom = sanitizeInput(customPrompt);
            iterationTask += `User requested change: ${sanitizedCustom}`;
        }

        if (!iterationTask.trim()) {
            iterationTask = "Enhance the image quality photorealistically while preserving all contents.";
        }

        finalPrompt += `\nAPPLY THIS INCREMENTAL CHANGE (preserve everything else): <user_instruction>${iterationTask.trim()}</user_instruction>`;

        return finalPrompt.replace(/\s+/g, ' ').trim();
    }

    // ── FIRST GENERATION: use full mode-specific prompts ──
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
        - Use the following style guidance as a color palette/texture guide for the walls: ${styleInstruction}.
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
        finalPrompt += `\nADDITIONAL USER REQUIREMENTS (Prioritize this instruction while strictly adhering to ALL structural rules): <user_instruction>${sanitizedCustom}</user_instruction>`;
    }

    // Clean up extra whitespace and return
    return finalPrompt.replace(/\s+/g, ' ').trim();
};
