import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreviewArea from './PreviewArea';
import type { UploadedImage } from '../types';

vi.mock('../services/geminiService', () => ({
  generateDroneTourScript: vi.fn(),
}));

vi.mock('./ZoomControls', () => ({
  default: () => <div data-testid="zoom-controls" />,
}));

vi.mock('./DownloadMenu', () => ({
  default: () => <div data-testid="download-menu" />,
}));

vi.mock('./DroneTourPlayer', () => ({
  default: () => <div data-testid="drone-tour-player" />,
}));

const makeImage = (generatedUrl: string): UploadedImage => ({
  id: 'img-1',
  file: null,
  previewUrl: 'blob:original-room',
  base64: '',
  generatedUrl,
  selected: true,
  isGenerating: false,
});

describe('PreviewArea', () => {
  it('resets the comparison slider when a new generated image is rendered', () => {
    const setViewMode = vi.fn();

    const { rerender } = render(
      <PreviewArea
        activeImage={makeImage('https://cdn.example.com/generated-v1.png')}
        imageIndex={0}
        totalImages={1}
        viewMode="split"
        setViewMode={setViewMode}
        handleDownloadComparison={vi.fn()}
        handleDownloadSingle={vi.fn()}
        handleDownloadAll={vi.fn()}
        onVideoGenerated={vi.fn()}
        onIterateOnGenerated={vi.fn()}
        hasGeneratedImages={true}
        isDownloadingZip={false}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSharePresentation={vi.fn()}
      />
    );

    const slider = screen.getByLabelText('Controle de comparação') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '10' } });
    expect(slider.value).toBe('10');

    rerender(
      <PreviewArea
        activeImage={makeImage('https://cdn.example.com/generated-v2.png')}
        imageIndex={0}
        totalImages={1}
        viewMode="split"
        setViewMode={setViewMode}
        handleDownloadComparison={vi.fn()}
        handleDownloadSingle={vi.fn()}
        handleDownloadAll={vi.fn()}
        onVideoGenerated={vi.fn()}
        onIterateOnGenerated={vi.fn()}
        hasGeneratedImages={true}
        isDownloadingZip={false}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSharePresentation={vi.fn()}
      />
    );

    expect((screen.getByLabelText('Controle de comparação') as HTMLInputElement).value).toBe('50');
  });
});
