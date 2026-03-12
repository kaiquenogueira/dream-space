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

type PaintScope = 'all_visible_walls' | 'accent_wall' | 'partial_walls';

const ALL_VISIBLE_WALLS_RULES = `
    WALL PAINT APPLICATION RULES (MANDATORY):
    1. Apply the requested paint/color/texture change to ALL visible walls in the same room.
    2. Keep the finish, tone, and texture UNIFORM and CONSISTENT across all matching wall surfaces.
    3. Do NOT leave one wall unchanged unless the user EXPLICITLY asks for an accent wall, feature wall, partial repaint, or different walls in different colors.
    4. Treat corners, wall returns, columns attached to walls, and continuous wall planes as part of the same repaint scope when visually connected.
    5. Preserve trim, baseboards, doors, windows, floors, ceilings, furniture, and decor exactly as they are unless explicitly requested otherwise.
`;

const STAGING_LAYOUT_RULES = `
    VIRTUAL STAGING LAYOUT RULES (MANDATORY):
    1. Add furniture at realistic scale for the room. Never oversize or overcrowd the space.
    2. Maintain clear circulation paths between doors, openings, and the main functional areas of the room.
    3. Do NOT block doors, windows, hallways, built-ins, cabinets, plumbing fixtures, or architectural focal points.
    4. Prefer a restrained, premium real-estate staging approach: elegant, believable, and not overdecorated.
    5. Use only the minimum furniture set needed to make the room feel complete and functional.
    6. Keep furniture placement physically plausible and aligned with walls, corners, and room geometry.
    7. Preserve any existing furniture or decor that is already present unless the user explicitly asks to replace or remove it.
    8. If the room is partially furnished, complement the existing setup instead of redesigning it from scratch.
`;

const ROOM_TYPE_STAGING_RULES = `
    ROOM-TYPE STAGING RULES:
    1. Living/Dining area:
       - Add sofa, coffee table, rug, side table, dining table, chairs, or media unit only if spatially appropriate.
       - Do NOT place bedroom furniture in a living/dining area.
    2. Bedroom:
       - Add bed, nightstands, bench, dresser, rug, or soft lighting if appropriate.
       - Do NOT place dining tables, kitchen islands, or bathroom fixtures in a bedroom.
    3. Office:
       - Add desk, task chair, bookshelf, lamp, or small lounge chair if appropriate.
       - Do NOT place beds or dining sets in an office unless explicitly requested.
    4. Kitchen:
       - Only add subtle staging elements compatible with a kitchen, such as stools, small decor, or table setting if space allows.
       - Do NOT add sofas, beds, or unrelated large furniture.
    5. Bathroom:
       - Only add minimal decor compatible with a bathroom, such as towels, stool, plant, or accessories.
       - Do NOT add sofas, beds, desks, or dining furniture.
`;

function detectPaintScope(input: string): PaintScope {
    const normalized = input.toLowerCase();

    const accentWallPattern = /\b(parede de destaque|accent wall|feature wall|somente uma parede|apenas uma parede|uma parede só|uma unica parede|uma única parede|parede principal)\b/;
    if (accentWallPattern.test(normalized)) {
        return 'accent_wall';
    }

    const partialWallPattern = /\b(meia parede|meio a meio|parcial|somente esta parede|apenas esta parede|somente essas paredes|apenas essas paredes|só a parede da tv|so a parede da tv|parede da tv|parede do fundo|parede lateral|painel|boiserie|lambril)\b/;
    if (partialWallPattern.test(normalized)) {
        return 'partial_walls';
    }

    return 'all_visible_walls';
}

function buildPaintScopeInstruction(customPrompt: string): string {
    const scope = detectPaintScope(customPrompt);

    if (scope === 'accent_wall') {
        return `
        Paint ONLY the single accent/feature wall explicitly requested by the user.
        Keep all other visible walls unchanged.
        Do NOT invent an accent wall if the request does not clearly identify one.
        `;
    }

    if (scope === 'partial_walls') {
        return `
        Paint ONLY the wall surfaces explicitly referenced by the user.
        Keep every other visible wall unchanged.
        Do NOT expand a partial-wall request into a full-room repaint.
        `;
    }

    return `
    Repaint ALL visible walls in this room consistently.
    ${ALL_VISIBLE_WALLS_RULES}
    `;
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
        1. PRESERVE EVERYTHING in this image exactly as it is — furniture, flooring, decor, lighting, camera framing, and all prior modifications.
        2. Make ONLY the specific changes described below. NOTHING ELSE.
        3. Do NOT add, remove, or rearrange any furniture or decor UNLESS explicitly asked for.
        4. Do NOT change wall colors, flooring, or any surface UNLESS explicitly asked for. If the request is to repaint walls, repaint ONLY the wall surfaces that are visible.
        5. If the user asks to change the floor, change ONLY the floor. If the user asks to add a sofa, add ONLY a sofa.
        6. NEVER add, remove, or move windows, doors, walls, or any openings.
        7. The result must be photorealistic, high-resolution architectural visualization.
        8. OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;

        let iterationTask = '';
        
        if (generationMode === GenerationMode.PAINT_ONLY) {
            iterationTask += buildPaintScopeInstruction(customPrompt);
            if (selectedStyle) {
                iterationTask += `Change the wall paint/texture to match the following style: ${styleInstruction}. `;
            }
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
        ${STAGING_LAYOUT_RULES}
        ${ROOM_TYPE_STAGING_RULES}
        
        INSTRUCTIONS:
        - Detect the room type based on the structure and furnish it accordingly using a ${styleInstruction}.
        - If the room is empty or sparse, add a complete but restrained furniture composition.
        - If the room already contains furniture, preserve it and only complement missing pieces unless explicitly instructed otherwise.
        - Add realistic furniture, rugs, curtains, lighting, and decor only when appropriate for the detected room type and available space.
        - DO NOT change the flooring material or wall paint unless explicitly asked.
        - Ensure all added furniture casts realistic shadows and matches the lighting of the room.
        - Keep the result market-ready, balanced, premium, and believable for a real-estate listing.
        - The result must be photorealistic, high-resolution architectural visualization.
        - OUTPUT ONLY THE EDITED IMAGE, no text explanation.
        `;
    } else if (generationMode === GenerationMode.PAINT_ONLY) {
        // Paint Only: Focus on wall painting, no furniture changes
        const paintScopeInstruction = buildPaintScopeInstruction(customPrompt);
        finalPrompt = `
        Edit this image. TASK: Wall Painting Only (No Furniture Changes).
        The attached image is the ORIGINAL ROOM — treat it as the absolute source of truth for all structural elements.
        ${structuralRules}
        ${environmentalAnalysis}
        ${paintScopeInstruction}
        
        INSTRUCTIONS:
        - Your ONLY task is to change the wall paint color/texture.
        - Use the following style guidance as a color palette/texture guide for the walls: ${styleInstruction}.
        - DO NOT ADD, REMOVE, OR CHANGE ANY FURNITURE.
        - DO NOT CHANGE FLOORING OR CEILING (unless specifically asked in custom prompt).
        - Existing furniture must remain exactly where it is, with the same design.
        - Focus purely on the wall surfaces and obey the requested repaint scope exactly.
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
        ${STAGING_LAYOUT_RULES}
        ${ROOM_TYPE_STAGING_RULES}
        
        INSTRUCTIONS:
        - Detect the room type based on the structure and furnish it accordingly using a ${styleInstruction}.
        - If the room is empty or sparse, add a complete but restrained furniture composition.
        - If the room already contains furniture, preserve it and only complement missing pieces unless explicitly instructed otherwise.
        - Add realistic furniture, rugs, curtains, lighting, and decor only when appropriate for the detected room type and available space.
        - DO NOT change the flooring material or wall paint unless explicitly asked.
        - Ensure all added furniture casts realistic shadows and matches the lighting of the room.
        - Keep the result market-ready, balanced, premium, and believable for a real-estate listing.
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
