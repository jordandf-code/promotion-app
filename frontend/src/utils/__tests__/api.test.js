// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
const { apiGet, apiPut, apiPutMarkClean, API_BASE, authHeaders } = await import('../api.js');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  store.token = 'test-jwt-token';
  // Clean up any sync warning banners
  document.querySelectorAll('.sync-warning').forEach(el => el.remove());
});

afterEach(() => {
  vi.useRealTimers();
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
  it('sends PUT with data payload after debounce', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    apiPut('test-put', [{ id: '1' }]);

    // Not yet sent (debounce)
    expect(mockFetch).not.toHaveBeenCalled();

    // Advance past debounce
    vi.advanceTimersByTime(300);

    // Let the async PUT resolve
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/data/test-put'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ data: [{ id: '1' }] }),
      })
    );
  });

  it('deduplicates when data has not changed', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    // First put
    apiPut('test-dedup', { a: 1 });
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Same data again — should be skipped
    apiPut('test-dedup', { a: 1 });
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips PUT when data matches apiPutMarkClean', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    apiPutMarkClean('test-clean', [1, 2, 3]);
    apiPut('test-clean', [1, 2, 3]);

    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retries once on network failure', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true });

    apiPut('test-retry', { fresh: true });
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();
    // Advance past the 1.5s retry delay
    vi.advanceTimersByTime(1500);
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('shows warning after two failures', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    apiPut('test-warn', { data: 'fail' });

    // Advance through debounce + first attempt + retry delay + second attempt
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(500);
      await vi.advanceTimersByTimeAsync(0);
    }

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.sync-warning')).not.toBeNull();
  });

  it('coalesces rapid writes via debounce', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    apiPut('test-coalesce', { v: 1 });
    vi.advanceTimersByTime(100);
    apiPut('test-coalesce', { v: 2 });
    vi.advanceTimersByTime(100);
    apiPut('test-coalesce', { v: 3 });

    // Advance past final debounce
    vi.advanceTimersByTime(300);
    await vi.runAllTimersAsync();

    // Only one actual PUT should have been sent
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // But note: due to closure, the PUT body captures the data at the time of the last apiPut call
    // The debounce sends whatever was last scheduled
  });
});
