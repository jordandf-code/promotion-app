// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const store = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn(k => store[k] ?? null),
  setItem: vi.fn((k, v) => { store[k] = v; }),
  removeItem: vi.fn(k => { delete store[k]; }),
});

// Set token before importing
store.token = 'test-jwt-token';

// Must import after mocks are set up
const { apiGet, apiPut, API_BASE, authHeaders } = await import('../api.js');

beforeEach(() => {
  vi.clearAllMocks();
  store.token = 'test-jwt-token';
  // Clean up any sync warning banners
  document.querySelectorAll('.sync-warning').forEach(el => el.remove());
});

describe('authHeaders', () => {
  it('includes Bearer token from localStorage', () => {
    const headers = authHeaders();
    expect(headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('merges extra headers', () => {
    const headers = authHeaders({ 'Content-Type': 'application/json' });
    expect(headers.Authorization).toBe('Bearer test-jwt-token');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('apiGet', () => {
  it('fetches from /api/data/:domain with auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: '1' }] }),
    });

    const result = await apiGet('wins');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/data/wins'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-jwt-token' }),
      })
    );
    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns null when no data stored', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });

    const result = await apiGet('goals');
    expect(result).toBeNull();
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(apiGet('wins')).rejects.toThrow(/500/);
  });
});

describe('apiPut', () => {
  it('sends PUT with data payload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await apiPut('wins', [{ id: '1' }]);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/data/wins'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ data: [{ id: '1' }] }),
      })
    );
  });

  it('retries once on network failure', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true });

    await apiPut('wins', []);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('shows warning after two network failures', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    await apiPut('wins', []);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.sync-warning')).not.toBeNull();
  });

  it('treats non-ok response same as failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true });

    await apiPut('wins', []);

    // Should have retried after first non-ok response
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
