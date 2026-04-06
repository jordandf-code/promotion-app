// hooks/scorecard/seedData.js
// Seed data used when no stored scorecard data exists.
// Realistic IBM Canada public sector sample data for 2023–2026.

import { MONTH_KEYS, emptyMonths } from './constants.js';

function seedMonths(totalHours) {
  const base = Math.floor(totalHours / 12);
  const remainder = totalHours % 12;
  return Object.fromEntries(
    MONTH_KEYS.map((key, i) => [key, { actual: base + (i < remainder ? 1 : 0), forecast: '' }])
  );
}

function seedQuarters(total, weights = [0.25, 0.25, 0.25, 0.25]) {
  return {
    q1: Math.round(total * weights[0]),
    q2: Math.round(total * weights[1]),
    q3: Math.round(total * weights[2]),
    q4: Math.round(total * weights[3]),
  };
}

export const SEED_OPPORTUNITIES = [
  { id: 'opp-2023-a', name: 'FY 2023 Signings (aggregate)', client: 'Multiple', year: 2023,
    status: 'won', winDate: '2023-12-31', totalValue: 2_020_000, signingsValue: 2_020_000 },

  { id: 'opp-2024-a', name: 'FY 2024 Signings (aggregate)', client: 'Multiple', year: 2024,
    status: 'won', winDate: '2024-12-31', totalValue: 2_150_000, signingsValue: 2_150_000 },

  { id: 'opp-2025-a', name: 'TBS Digital Modernization', client: 'Treasury Board Secretariat', year: 2025,
    status: 'won', winDate: '2025-02-14', totalValue: 5_000_000, signingsValue: 1_420_000 },
  { id: 'opp-2025-b', name: 'City of Ottawa IT Renewal', client: 'City of Ottawa', year: 2025,
    status: 'won', winDate: '2025-06-30', totalValue: 800_000, signingsValue: 400_000 },

  { id: 'opp-2026-a', name: 'Ontario Digital Services renewal', client: 'Ontario Digital Services', year: 2026,
    status: 'won', winDate: '2026-03-20', totalValue: 2_100_000, signingsValue: 710_000 },
  { id: 'opp-2026-b', name: 'SSC Workplace Technology', client: 'Shared Services Canada', year: 2026,
    status: 'open', winDate: null, totalValue: 1_800_000, signingsValue: 800_000 },
];

export const SEED_PROJECTS = [
  { id: 'proj-2023-a', name: 'FY 2023 Revenue (aggregate)', client: 'Multiple', year: 2023,
    status: 'realized', opportunityId: 'opp-2023-a',
    revenue:     { q1: 720_000, q2: 750_000, q3: 740_000, q4: 740_000 },
    grossProfit: { q1: 195_000, q2: 202_000, q3: 201_000, q4: 202_000 } },

  { id: 'proj-2024-a', name: 'FY 2024 Revenue (aggregate)', client: 'Multiple', year: 2024,
    status: 'realized', opportunityId: 'opp-2024-a',
    revenue:     { q1: 780_000, q2: 800_000, q3: 810_000, q4: 790_000 },
    grossProfit: { q1: 228_000, q2: 232_000, q3: 233_000, q4: 227_000 } },

  { id: 'proj-2025-a', name: 'TBS Digital Modernization delivery', client: 'Treasury Board Secretariat', year: 2025,
    status: 'realized', opportunityId: 'opp-2025-a',
    revenue:     seedQuarters(2_540_000, [0.20, 0.30, 0.30, 0.20]),
    grossProfit: seedQuarters(650_000,   [0.20, 0.30, 0.30, 0.20]) },
  { id: 'proj-2025-b', name: 'City of Ottawa IT Renewal delivery', client: 'City of Ottawa', year: 2025,
    status: 'realized', opportunityId: 'opp-2025-b',
    revenue:     { q1: 0, q2: 200_000, q3: 200_000, q4: 0 },
    grossProfit: { q1: 0, q2: 80_000,  q3: 80_000,  q4: 0 } },

  { id: 'proj-2026-a', name: 'Ontario Digital Services renewal delivery', client: 'Ontario Digital Services', year: 2026,
    status: 'realized', opportunityId: 'opp-2026-a',
    revenue:     { q1: 1_120_000, q2: 0, q3: 0, q4: 0 },
    grossProfit: { q1:   340_000, q2: 0, q3: 0, q4: 0 } },
  { id: 'proj-2026-b', name: 'TBS Advisory Services', client: 'Treasury Board Secretariat', year: 2026,
    status: 'forecast', opportunityId: null,
    revenue:     { q1: 0, q2: 0, q3: 600_000, q4: 600_000 },
    grossProfit: { q1: 0, q2: 0, q3: 150_000, q4: 150_000 } },
  { id: 'proj-2026-c', name: 'SSC Workplace Technology — delivery phase', client: 'Shared Services Canada', year: 2026,
    status: 'forecast', opportunityId: 'opp-2026-b',
    revenue:     { q1: 0, q2: 0, q3: 0, q4: 600_000 },
    grossProfit: { q1: 0, q2: 0, q3: 0, q4: 120_000 } },
];

export const SEED_TARGETS = {
  2023: { sales: 1_800_000, revenue: 2_800_000, grossProfit:  750_000, utilization: 1820 },
  2024: { sales: 2_000_000, revenue: 3_000_000, grossProfit:  850_000, utilization: 1820 },
  2025: { sales: 2_200_000, revenue: 3_200_000, grossProfit:  900_000, utilization: 1820 },
  2026: { sales: 2_500_000, revenue: 3_500_000, grossProfit:  950_000, utilization: 1820 },
  2027: { sales: null,      revenue: null,      grossProfit:  null,    utilization: null  },
  2028: { sales: null,      revenue: null,      grossProfit:  null,    utilization: null  },
  2029: { sales: null,      revenue: null,      grossProfit:  null,    utilization: null  },
};

export const SEED_UTILIZATION = {
  2023: { months: seedMonths(1840) },
  2024: { months: seedMonths(1795) },
  2025: { months: seedMonths(1680) },
  2026: { months: {
    jan: { actual: 152, forecast: ''  },
    feb: { actual: 148, forecast: ''  },
    mar: { actual: 112, forecast: ''  },
    apr: { actual: '',  forecast: 160 },
    may: { actual: '',  forecast: 165 },
    jun: { actual: '',  forecast: 155 },
    jul: { actual: '',  forecast: 160 },
    aug: { actual: '',  forecast: 158 },
    sep: { actual: '',  forecast: 155 },
    oct: { actual: '',  forecast: 160 },
    nov: { actual: '',  forecast: 155 },
    dec: { actual: '',  forecast: 140 },
  }},
  2027: { months: emptyMonths() },
  2028: { months: emptyMonths() },
  2029: { months: emptyMonths() },
};
