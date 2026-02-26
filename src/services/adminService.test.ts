import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './adminService';
import { supabase } from '../lib/supabase';

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

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({ 
      data: { session: { access_token: 'test-token' } } 
    });
  });

  describe('fetchUsers', () => {
    it('should fetch users successfully', async () => {
      const mockUsers = [{ id: '1', email: 'test@test.com' }];
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockUsers),
        headers: { get: () => 'application/json' },
      });

      const users = await adminService.fetchUsers();
      expect(users).toEqual(mockUsers);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/users'), expect.anything());
    });

    it('should throw error if not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
      await expect(adminService.fetchUsers()).rejects.toThrow('Não autenticado');
    });

    it('should handle API errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        text: async () => JSON.stringify({ error: 'Server error' }),
        headers: { get: () => 'application/json' },
      });

      await expect(adminService.fetchUsers()).rejects.toThrow('Server error');
    });
  });

  describe('updateCredits', () => {
    it('should update credits successfully', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
        headers: { get: () => 'application/json' },
      });

      await adminService.updateCredits('user1', 10);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/credits'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 'user1', credits: 10 }),
        })
      );
    });
  });
});
