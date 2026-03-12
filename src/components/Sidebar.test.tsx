import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from './Sidebar';
import type { UploadedImage } from '../types';

vi.mock('./ImageUploader', () => ({
  default: () => <div data-testid="image-uploader" />,
}));

vi.mock('../hooks/useContainerSize', () => ({
  useContainerSize: () => ({ width: 320, height: 480 }),
}));

vi.mock('react-window', () => ({
  FixedSizeGrid: ({ children, columnCount, rowCount }: any) => (
    <div>
      {Array.from({ length: rowCount }).flatMap((_, rowIndex) =>
        Array.from({ length: columnCount }).map((__, columnIndex) => (
          <div key={`${rowIndex}-${columnIndex}`}>
            {children({
              columnIndex,
              rowIndex,
              style: { left: 0, top: 0, width: 160, height: 100 }
            })}
          </div>
        ))
      )}
    </div>
  ),
}));

const baseImage: UploadedImage = {
  id: 'img-1',
  file: null,
  previewUrl: 'blob:original-room',
  base64: '',
  generatedUrl: 'https://cdn.example.com/generated-room.png',
  selected: true,
  isGenerating: false,
};

describe('Sidebar', () => {
  it('renders the generated image thumbnail when a result already exists', () => {
    render(
      <Sidebar
        images={[baseImage]}
        selectedImageId="img-1"
        setSelectedImageId={vi.fn()}
        removeImage={vi.fn()}
        handleImagesSelected={vi.fn()}
        maxImages={10}
        activeProperty={{ id: 'prop-1', name: 'Casa', images: [baseImage], createdAt: Date.now() }}
        activePropertyId="prop-1"
        setProperties={vi.fn()}
        handleLogoUpload={vi.fn()}
        toggleImageSelection={vi.fn()}
        toggleSelectAll={vi.fn()}
        handleRegenerateSingle={vi.fn()}
        isGenerating={false}
      />
    );

    expect(screen.getByAltText('Ambiente')).toHaveAttribute('src', 'https://cdn.example.com/generated-room.png');
  });
});
