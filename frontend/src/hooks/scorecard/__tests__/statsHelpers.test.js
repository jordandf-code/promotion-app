import { describe, it, expect } from 'vitest';
import { getSalesStats, getRevenueStats, getGPStats, getUtilStats } from '../statsHelpers.js';

// ── Fixtures ──────────────────────────────────────────────────────────────

const TARGETS = {
  2026: { sales: 2_500_000, revenue: 3_500_000, grossProfit: 950_000, utilization: 1820 },
  2027: { sales: null,      revenue: null,      grossProfit: null,    utilization: null  },
};

const OPPORTUNITIES = [
  { id: 'o1', year: 2026, status: 'won',  signingsValue: 710_000  },
  { id: 'o2', year: 2026, status: 'open', signingsValue: 800_000  },
  { id: 'o3', year: 2026, status: 'lost', signingsValue: 500_000  },
  { id: 'o4', year: 2025, status: 'won',  signingsValue: 1_000_000 },
];

const PROJECTS = [
  { id: 'p1', year: 2026, status: 'realized', revenue: { q1: 1_000_000, q2: 0,       q3: 0, q4: 0 }, grossProfit: { q1: 300_000, q2: 0, q3: 0, q4: 0 } },
  { id: 'p2', year: 2026, status: 'forecast', revenue: { q1: 0,         q2: 600_000, q3: 0, q4: 0 }, grossProfit: { q1: 0, q2: 150_000, q3: 0, q4: 0 } },
  { id: 'p3', year: 2025, status: 'realized', revenue: { q1: 500_000,   q2: 0,       q3: 0, q4: 0 }, grossProfit: { q1: 120_000, q2: 0, q3: 0, q4: 0 } },
];

// ── getSalesStats ─────────────────────────────────────────────────────────

describe('getSalesStats', () => {
  it('sums won opportunities as realized', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2026);
    expect(result.realized).toBe(710_000);
  });

  it('sums open opportunities as forecast', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2026);
    expect(result.forecast).toBe(800_000);
  });

  it('excludes lost opportunities from all totals', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2026);
    expect(result.realized).toBe(710_000);
    expect(result.forecast).toBe(800_000);
    expect(result.total).toBe(1_510_000);
  });

  it('only includes opportunities for the requested year', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2025);
    expect(result.realized).toBe(1_000_000);
    expect(result.forecast).toBe(0);
  });

  it('returns the correct target for the year', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2026);
    expect(result.target).toBe(2_500_000);
  });

  it('returns null target when not set', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2027);
    expect(result.target).toBeNull();
  });

  it('returns zeros when no opportunities exist for the year', () => {
    const result = getSalesStats(OPPORTUNITIES, TARGETS, 2030);
    expect(result.realized).toBe(0);
    expect(result.forecast).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles missing or non-numeric signingsValue gracefully', () => {
    const opps = [{ id: 'x', year: 2026, status: 'won', signingsValue: null }];
    const result = getSalesStats(opps, TARGETS, 2026);
    expect(result.realized).toBe(0);
  });
});

// ── getRevenueStats ───────────────────────────────────────────────────────

describe('getRevenueStats', () => {
  it('sums realized project revenue correctly', () => {
    const result = getRevenueStats(PROJECTS, TARGETS, 2026);
    expect(result.realized).toBe(1_000_000);
  });

  it('sums forecast project revenue correctly', () => {
    const result = getRevenueStats(PROJECTS, TARGETS, 2026);
    expect(result.forecast).toBe(600_000);
  });

  it('only includes projects for the requested year', () => {
    const result = getRevenueStats(PROJECTS, TARGETS, 2025);
    expect(result.realized).toBe(500_000);
    expect(result.forecast).toBe(0);
  });

  it('returns null target when not set', () => {
    const result = getRevenueStats(PROJECTS, TARGETS, 2027);
    expect(result.target).toBeNull();
  });

  it('returns zeros when no projects exist for the year', () => {
    const result = getRevenueStats(PROJECTS, TARGETS, 2030);
    expect(result.realized).toBe(0);
    expect(result.forecast).toBe(0);
  });
});

// ── getGPStats ────────────────────────────────────────────────────────────

describe('getGPStats', () => {
  it('sums realized gross profit correctly', () => {
    const result = getGPStats(PROJECTS, TARGETS, 2026);
    expect(result.realized).toBe(300_000);
  });

  it('sums forecast gross profit correctly', () => {
    const result = getGPStats(PROJECTS, TARGETS, 2026);
    expect(result.forecast).toBe(150_000);
  });

  it('total equals realized plus forecast', () => {
    const result = getGPStats(PROJECTS, TARGETS, 2026);
    expect(result.total).toBe(result.realized + result.forecast);
  });
});

// ── getUtilStats ──────────────────────────────────────────────────────────

describe('getUtilStats', () => {
  const UTIL = {
    2026: {
      months: {
        jan: { actual: 150, forecast: ''  },
        feb: { actual: 140, forecast: ''  },
        mar: { actual: '',  forecast: 160 },
        apr: { actual: '',  forecast: 160 },
        may: { actual: '',  forecast: '' },
        jun: { actual: '',  forecast: '' },
        jul: { actual: '',  forecast: '' },
        aug: { actual: '',  forecast: '' },
        sep: { actual: '',  forecast: '' },
        oct: { actual: '',  forecast: '' },
        nov: { actual: '',  forecast: '' },
        dec: { actual: '',  forecast: '' },
      },
    },
  };

  it('counts only actuals toward hoursToDate', () => {
    const result = getUtilStats(UTIL, TARGETS, 2026);
    expect(result.hoursToDate).toBe(290); // 150 + 140
  });

  it('projection includes actuals plus forecasts', () => {
    const result = getUtilStats(UTIL, TARGETS, 2026);
    expect(result.projection).toBe(610); // 150 + 140 + 160 + 160
  });

  it('actuals override forecasts — a month with both uses actual only', () => {
    const util = {
      2026: {
        months: {
          ...UTIL[2026].months,
          jan: { actual: 150, forecast: 200 }, // forecast should be ignored
        },
      },
    };
    const result = getUtilStats(util, TARGETS, 2026);
    expect(result.hoursToDate).toBe(290);
    expect(result.projection).toBe(610);
  });

  it('calculates pct of annual target correctly', () => {
    const result = getUtilStats(UTIL, TARGETS, 2026);
    expect(result.pct).toBe(Math.round((610 / 1820) * 100));
  });

  it('returns null pct when target is not set', () => {
    const result = getUtilStats(UTIL, TARGETS, 2027);
    expect(result.pct).toBeNull();
  });

  it('returns zeros for a year with no data', () => {
    const result = getUtilStats({}, TARGETS, 2030);
    expect(result.hoursToDate).toBe(0);
    expect(result.projection).toBe(0);
  });

  it('ignores months with empty string values', () => {
    const util = { 2026: { months: { jan: { actual: '', forecast: '' } } } };
    const result = getUtilStats(util, TARGETS, 2026);
    expect(result.hoursToDate).toBe(0);
    expect(result.projection).toBe(0);
  });
});
