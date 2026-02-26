
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DroneTourPlayer from './DroneTourPlayer';
import { supabase } from '../lib/supabase';
import React from 'react';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('DroneTourPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Don't use fake timers as they are causing issues with waitFor/act in this environment
    // Instead we'll rely on the fact that useEffect runs immediately on mount
    
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'fake-token' } } 
    });
  });

  it('should start polling when mounted with operation name', async () => {
    const mockResponse = { done: false };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <DroneTourPlayer
        imageUrl="http://img.url"
        videoOperationName="ops/123"
        onClose={vi.fn()}
      />
    );

    // Initial check should happen immediately
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/check-operation?operationName=ops%2F123'),
        expect.anything()
      );
    });
  });

  it('should show video when done (simulated immediately)', async () => {
    // Return done immediately to avoid waiting for interval
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        done: true,
        result: {
            generatedVideos: [{ video: { uri: 'http://video.mp4' } }]
        }
      }),
    });

    const onVideoGenerated = vi.fn();

    render(
      <DroneTourPlayer
        imageUrl="http://img.url"
        videoOperationName="ops/123"
        onVideoGenerated={onVideoGenerated}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
        expect(onVideoGenerated).toHaveBeenCalledWith('http://video.mp4');
    });
  });

  it('should show error if API returns error', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        done: true, 
        error: { message: 'Generation failed' } 
      }),
    });

    render(
      <DroneTourPlayer
        imageUrl="http://img.url"
        videoOperationName="ops/123"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
        expect(screen.getByText(/Falha na geração: Generation failed/i)).toBeInTheDocument();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
