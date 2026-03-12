import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DesignStudio from './DesignStudio';
import { GenerationMode } from '../types';

vi.mock('./StyleSelector', () => ({
  default: () => <div data-testid="style-selector" />,
}));

describe('DesignStudio', () => {
  it('shows paint guidance examples when paint mode is active', () => {
    const setCustomPrompt = vi.fn();

    render(
      <DesignStudio
        isGenerating={false}
        hasImages={true}
        handleGenerateAll={vi.fn()}
        generationMode={GenerationMode.PAINT_ONLY}
        setGenerationMode={vi.fn()}
        selectedStyle={null}
        setSelectedStyle={vi.fn()}
        customPrompt=""
        setCustomPrompt={setCustomPrompt}
      />
    );

    expect(screen.getByPlaceholderText(/Pintar todas as paredes de verde sálvia fosco/i)).toBeInTheDocument();
    expect(screen.getByText(/parede de destaque azul marinho atrás do sofá/i)).toBeInTheDocument();
    expect(screen.getByText(/somente uma parede específica/i)).toBeInTheDocument();
  });

  it('adds a paint suggestion to the prompt field', () => {
    const setCustomPrompt = vi.fn();

    render(
      <DesignStudio
        isGenerating={false}
        hasImages={true}
        handleGenerateAll={vi.fn()}
        generationMode={GenerationMode.PAINT_ONLY}
        setGenerationMode={vi.fn()}
        selectedStyle={null}
        setSelectedStyle={vi.fn()}
        customPrompt=""
        setCustomPrompt={setCustomPrompt}
      />
    );

    fireEvent.click(screen.getByText(/Pintar somente a parede da TV em bege areia/i));
    expect(setCustomPrompt).toHaveBeenCalledWith('Pintar somente a parede da TV em bege areia');
  });

  it('shows staging guidance examples when furnishing mode is active', () => {
    render(
      <DesignStudio
        isGenerating={false}
        hasImages={true}
        handleGenerateAll={vi.fn()}
        generationMode={GenerationMode.VIRTUAL_STAGING}
        setGenerationMode={vi.fn()}
        selectedStyle={null}
        setSelectedStyle={vi.fn()}
        customPrompt=""
        setCustomPrompt={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/Mobiliar como sala contemporânea com sofá claro/i)).toBeInTheDocument();
    expect(screen.getByText(/Completar o home office sem trocar os móveis existentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Peça o uso do ambiente, nível de decoração/i)).toBeInTheDocument();
  });
});
