import { describe, it, expect } from 'vitest';
import { STATUSES, STATUS_LABELS, nextStatus } from '../useGoalsData.js';

describe('STATUSES', () => {
  it('contains exactly three statuses in order', () => {
    expect(STATUSES).toEqual(['not_started', 'in_progress', 'done']);
  });
});

describe('STATUS_LABELS', () => {
  it('maps each status to a human-readable label', () => {
    expect(STATUS_LABELS.not_started).toBe('Not started');
    expect(STATUS_LABELS.in_progress).toBe('In progress');
    expect(STATUS_LABELS.done).toBe('Done');
  });
});

describe('nextStatus', () => {
  it('cycles not_started → in_progress', () => {
    expect(nextStatus('not_started')).toBe('in_progress');
  });

  it('cycles in_progress → done', () => {
    expect(nextStatus('in_progress')).toBe('done');
  });

  it('cycles done → not_started', () => {
    expect(nextStatus('done')).toBe('not_started');
  });

  it('returns not_started for unknown status', () => {
    // indexOf returns -1 for unknown, so (-1+1) % 3 = 0 → 'not_started'
    expect(nextStatus('unknown')).toBe('not_started');
  });
});
