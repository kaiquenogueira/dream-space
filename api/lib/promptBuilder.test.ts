import { describe, it, expect } from 'vitest';
import { buildPrompt, GenerationMode, ArchitecturalStyle } from './promptBuilder';

describe('buildPrompt', () => {
    it('should include mandatory structural preservation rules in all modes', () => {
        const modes = [GenerationMode.REDESIGN, GenerationMode.VIRTUAL_STAGING, GenerationMode.PAINT_ONLY];
        
        modes.forEach(mode => {
            const prompt = buildPrompt({
                generationMode: mode,
                selectedStyle: ArchitecturalStyle.MODERN,
                customPrompt: ''
            });

            expect(prompt).toContain('CRITICAL STRUCTURAL PRESERVATION RULES (MANDATORY)');
            expect(prompt).toContain('ABSOLUTELY FORBIDDEN to move, resize, remove, or alter any existing walls');
            expect(prompt).toContain('Structural integrity is PARAMOUNT');
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

    it('should generate correct prompt for REDESIGN mode', () => {
        const prompt = buildPrompt({
            generationMode: GenerationMode.REDESIGN,
            selectedStyle: ArchitecturalStyle.MODERN,
            customPrompt: ''
        });

        expect(prompt).toContain('TASK: Interior Redesign (Renovation)');
        expect(prompt).toContain('completely redesign the interior style');
        expect(prompt).toContain('You MAY update: wall colors');
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
});
