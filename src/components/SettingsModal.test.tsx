import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from './SettingsModal';
import { useAuth } from '../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../hooks/useAuth', () => ({
    useAuth: vi.fn()
}));

// Mock Supabase to avoid actual network requests during testing
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn().mockImplementation(() => ({
            update: vi.fn().mockImplementation(() => ({
                eq: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
        })),
        storage: {
            from: vi.fn().mockImplementation(() => ({
                upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
                getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'url' } })
            }))
        }
    }
}));

describe('SettingsModal', () => {
    const mockRefreshProfile = vi.fn();
    const mockOnClose = vi.fn();

    // Default profile for testing
    const defaultProfile = {
        id: "123",
        email: "test@example.com",
        plan: "free",
        credits: 10,
        agency_name: "Test Agency",
        contact_phone: "11999999999",
        contact_email: "agency@example.com",
        agency_logo: null,
        full_name: "Test User",
        avatar_url: null,
        credits_remaining: 10,
        credits_reset_at: null,
        is_admin: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mock return value
        (useAuth as any).mockReturnValue({
            profile: defaultProfile,
            refreshProfile: mockRefreshProfile
        });

        // Mock fetch for the API calls saving user data
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true })
        });
    });

    it('returns null if not open', () => {
        const { container } = render(<SettingsModal isOpen={false} onClose={mockOnClose} profile={defaultProfile} onProfileUpdate={mockRefreshProfile} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders the modal with populated initial values', () => {
        render(<SettingsModal isOpen={true} onClose={mockOnClose} profile={defaultProfile} onProfileUpdate={mockRefreshProfile} />);

        expect(screen.getByText('Configurações da Imobiliária')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Agency')).toBeInTheDocument();
        expect(screen.getByDisplayValue('11999999999')).toBeInTheDocument();
        expect(screen.getByDisplayValue('agency@example.com')).toBeInTheDocument();
    });

    it('calls closing function when canceled', () => {
        render(<SettingsModal isOpen={true} onClose={mockOnClose} profile={defaultProfile} onProfileUpdate={mockRefreshProfile} />);

        fireEvent.click(screen.getByText('Cancelar'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('submits valid data to the API', async () => {
        render(<SettingsModal isOpen={true} onClose={mockOnClose} profile={defaultProfile} onProfileUpdate={mockRefreshProfile} />);

        const nameInput = screen.getByLabelText('Nome da Agência / Corretor');
        fireEvent.change(nameInput, { target: { value: 'New Awesome Agency' } });

        const saveButton = screen.getByText('Salvar Alterações');
        fireEvent.click(saveButton);

        expect(saveButton).toBeDisabled(); // Should show loading state

        // Since React 18 setState is asynchronous, we wait for the save routine to finish
        // We know it finished when mockOnClose is called.
        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
            expect(mockRefreshProfile).toHaveBeenCalled();
        });
    });
});
