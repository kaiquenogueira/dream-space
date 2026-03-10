import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SharePresentationModal from './SharePresentationModal';
import { supabase } from '../lib/supabase';
import { saveAs } from 'file-saver';

// Mock Dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
        }
    }
}));

vi.mock('file-saver', () => ({
    saveAs: vi.fn()
}));

// Mock pdf generation tools to avoid canvas errors in JSDOM
vi.mock('jspdf', () => {
    return {
        default: class MockJSPDF {
            internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
            addPage = vi.fn();
            addImage = vi.fn();
            output = vi.fn().mockReturnValue(new Blob());
        }
    };
});

vi.mock('html2canvas', () => {
    return {
        default: vi.fn().mockResolvedValue({
            toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock'),
            width: 800,
            height: 600
        })
    };
});

describe('SharePresentationModal', () => {
    const mockOnClose = vi.fn();
    const mockProfile = { id: '123', plan: 'free', agency_name: 'Agency' } as any;

    // Some mock images, one has a generated URL, the other doesn't
    const getMockImages = () => [
        { id: 'img1', file: new File([], ''), base64: '', previewUrl: 'blob:1', originalPath: 'p1', generatedUrl: 'url1', selected: true },
        { id: 'img2', file: new File([], ''), base64: '', previewUrl: 'blob:2', originalPath: 'p2', selected: true } // No generated URL
    ] as any; // Cast as any or UploadedImage[] to satisfy TS during test

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock fetch for API limits
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });

        // Setup auth mock
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { user: { id: 'user1' } } }
        });
    });

    it('returns null if not open', () => {
        const { container } = render(
            <SharePresentationModal isOpen={false} onClose={mockOnClose} images={getMockImages()} profile={mockProfile} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders with correct default title extracted from propertyTitle', () => {
        render(
            <SharePresentationModal isOpen={true} onClose={mockOnClose} images={getMockImages()} profile={mockProfile} propertyTitle="Casa na Praia" />
        );

        expect(screen.getByText('Gerar Apresentação em PDF')).toBeInTheDocument();
    });

    it('shows warning if free user', () => {
        render(
            <SharePresentationModal isOpen={true} onClose={mockOnClose} images={getMockImages()} profile={mockProfile} />
        );
        expect(screen.getByText(/Aviso do Plano Gratuito/i)).toBeInTheDocument();
    });

    it('does not show warning if paid user', () => {
        render(
            <SharePresentationModal isOpen={true} onClose={mockOnClose} images={getMockImages()} profile={{ ...mockProfile, plan: 'pro' }} />
        );
        expect(screen.queryByText(/Aviso do Plano Gratuito/i)).toBeNull();
    });

    it('generates PDF and calls API when submitted', async () => {
        render(
            <SharePresentationModal isOpen={true} onClose={mockOnClose} images={getMockImages()} profile={mockProfile} />
        );

        const generateButton = screen.getByText('Gerar PDF Inteligente');
        fireEvent.click(generateButton);

        // Should disable button and show loading text (which is actually a spinner icon + text)
        expect(generateButton).toBeDisabled();

        await waitFor(() => {
            // Verify html2canvas and jsPDF workflow was triggered
            expect(saveAs).toHaveBeenCalled();
            // Verify API tracking was called
            expect(global.fetch).toHaveBeenCalledWith('/api/presentations/create', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('local_download_only')
            }));

            // Should show success view
            expect(screen.getByText('PDF Gerado com Sucesso!')).toBeInTheDocument();
        });
    });

    it('displays error if API limit is reached', async () => {
        // Mock API rejecting it (e.g. Free user limit hit)
        global.fetch = vi.fn().mockResolvedValue({
            ok: false, // 403 Forbidden
            json: async () => ({ error: 'Limite de 1 apresentação atingido no plano Gratuito.' })
        });

        render(
            <SharePresentationModal isOpen={true} onClose={mockOnClose} images={getMockImages()} profile={mockProfile} />
        );

        fireEvent.click(screen.getByText('Gerar PDF Inteligente'));

        await waitFor(() => {
            expect(screen.getByText('Limite de 1 apresentação atingido no plano Gratuito.')).toBeInTheDocument();
        });
    });
});
