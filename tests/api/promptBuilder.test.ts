import { describe, it, expect } from 'vitest';
import { buildPrompt, GenerationMode, ArchitecturalStyle } from '../../api/_lib/promptBuilder';

describe('buildPrompt', () => {
    it('should include mandatory structural preservation rules in all modes', () => {
        const modes = [GenerationMode.VIRTUAL_STAGING, GenerationMode.PAINT_ONLY];

        modes.forEach(mode => {
            const prompt = buildPrompt({
                generationMode: mode,
                selectedStyle: ArchitecturalStyle.MODERN,
                customPrompt: ''
            });

            expect(prompt).toContain('CRITICAL STRUCTURAL PRESERVATION RULES (MANDATORY AND ABSOLUTE)');
            expect(prompt).toContain('NOT allowed to hallucinate, add, remove, close, or move ANY windows, doors, walls');
            expect(prompt).toContain('MUST remain EXACTLY the same');
        });
    });

    it('should generate correct prompt for PAINT_ONLY mode', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.PAINT_ONLY,
            selectedStyle: null,
            customPrompt: 'Blue walls'
        });

        expect(prompt).toContain('TASK: Wall Painting Only (No Furniture Changes)');
        expect(prompt).toContain('Your ONLY task is to change the wall paint color/texture');
        expect(prompt).toContain('DO NOT ADD, REMOVE, OR CHANGE ANY FURNITURE');
        expect(prompt).toContain('Blue walls');
        expect(prompt).toContain('Apply the requested paint/color/texture change to ALL visible walls in the same room');
        expect(prompt).toContain('Do NOT leave one wall unchanged unless the user EXPLICITLY asks for an accent wall');
    });

    it('should generate correct prompt for VIRTUAL_STAGING mode', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.VIRTUAL_STAGING,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: ''
        });

        expect(prompt).toContain('TASK: Virtual Staging (Furnish Empty Room)');
        expect(prompt).toContain('If the room is empty or sparse, add a complete but restrained furniture composition');
        expect(prompt).toContain('Maintain clear circulation paths between doors, openings, and the main functional areas of the room');
        expect(prompt).toContain('If the room already contains furniture, preserve it and only complement missing pieces');
        expect(prompt).toContain('Keep the result market-ready, balanced, premium, and believable for a real-estate listing');
    });


    it('should sanitize custom prompt', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.PAINT_ONLY,
            selectedStyle: null,
            customPrompt: '  Blue   walls  '
        });

        expect(prompt).toContain('<user_instruction>Blue walls</user_instruction>');
    });

    it('should use dedicated iteration prompt when isIteration is true', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.VIRTUAL_STAGING,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: 'Change flooring to marble',
            isIteration: true
        });

        // Should use iteration-specific prompt
        expect(prompt).toContain('Incremental Edit on Previously Generated Image');
        expect(prompt).toContain('CRITICAL ITERATION RULES');
        expect(prompt).toContain('PRESERVE EVERYTHING');
        expect(prompt).toContain('Change flooring to marble');

        // Should NOT contain mode-specific instructions
        expect(prompt).not.toContain('Virtual Staging (Furnish Empty Room)');
        expect(prompt).not.toContain('fill it with realistic furniture');
    });

    it('should NOT use iteration prompt when isIteration is false or undefined', () => {
        const promptExplicitFalse = buildPrompt({
            generationMode: GenerationMode.VIRTUAL_STAGING,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: '',
            isIteration: false
        });

        const promptUndefined = buildPrompt({
            generationMode: GenerationMode.VIRTUAL_STAGING,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: ''
        });

        expect(promptExplicitFalse).not.toContain('Incremental Edit');
        expect(promptExplicitFalse).toContain('Virtual Staging (Furnish Empty Room)');
        expect(promptUndefined).not.toContain('Incremental Edit');
        expect(promptUndefined).toContain('Virtual Staging (Furnish Empty Room)');
    });

    it('should use iteration prompt regardless of generation mode', () => {
        const modes = [GenerationMode.VIRTUAL_STAGING, GenerationMode.PAINT_ONLY];

        modes.forEach(mode => {
            const prompt = buildPrompt({
                generationMode: mode,
                selectedStyle: ArchitecturalStyle.MODERN,
                customPrompt: 'Test prompt',
                isIteration: true
            });

            expect(prompt).toContain('Incremental Edit on Previously Generated Image');
            expect(prompt).toContain('CRITICAL ITERATION RULES');
            // Mode-specific task names should NOT appear
            expect(prompt).not.toContain('Furnish Empty Room');
            expect(prompt).not.toContain('Wall Painting Only');
        });
    });

    it('should instruct uniform repaint across all visible walls during paint iteration', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.PAINT_ONLY,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: 'Pintar todas as paredes de verde sálvia',
            isIteration: true
        });

        expect(prompt).toContain('Repaint ALL visible walls in this room consistently');
        expect(prompt).toContain('Keep the finish, tone, and texture UNIFORM and CONSISTENT across all matching wall surfaces');
        expect(prompt).toContain('Do NOT leave one wall unchanged unless the user EXPLICITLY asks for an accent wall');
        expect(prompt).not.toContain('PRESERVE EVERYTHING in this image exactly as it is — walls, paint colors');
    });

    it('should constrain accent wall requests to a single wall', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.PAINT_ONLY,
            selectedStyle: null,
            customPrompt: 'Criar uma parede de destaque azul marinho atrás do sofá',
            isIteration: true
        });

        expect(prompt).toContain('Paint ONLY the single accent/feature wall explicitly requested by the user');
        expect(prompt).toContain('Keep all other visible walls unchanged');
        expect(prompt).not.toContain('Apply the requested paint/color/texture change to ALL visible walls in the same room');
    });

    it('should constrain partial wall requests to the referenced surfaces only', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.PAINT_ONLY,
            selectedStyle: null,
            customPrompt: 'Pintar somente a parede da TV em bege areia'
        });

        expect(prompt).toContain('Paint ONLY the wall surfaces explicitly referenced by the user');
        expect(prompt).toContain('Keep every other visible wall unchanged');
        expect(prompt).not.toContain('Apply the requested paint/color/texture change to ALL visible walls in the same room');
    });
});
