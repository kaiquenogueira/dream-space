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
            expect(prompt).toContain('NOT allowed to hallucinate, add, or close ANY windows, doors, walls');
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
    });

    it('should generate correct prompt for VIRTUAL_STAGING mode', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.VIRTUAL_STAGING,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: ''
        });

        expect(prompt).toContain('TASK: Virtual Staging (Furnish Empty Room)');
        expect(prompt).toContain('The room is currently empty or sparse');
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
});
