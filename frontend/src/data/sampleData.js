// data/sampleData.js
// Hardcoded sample data for Phase 3 UI shell.
// Replaced by live PostgreSQL data in Phase 11.
//
// Scorecard data is keyed by calendar year so it works correctly regardless
// of what the user sets as their promotion year.

// ── Scorecard ──────────────────────────────────────────────────────────────

export const scorecard = {
  sales: {
    label: 'Sales',
    format: 'currency',
    targets: {
      2023: 1_800_000,
      2024: 2_000_000,
      2025: 2_200_000,
      2026: 2_500_000,
      2027: null,
    },
    actuals: {
      2023: 2_020_000,
      2024: 2_150_000,
      2025: 1_820_000,
      2026: 710_000,
      2027: 0,
    },
  },
  revenue: {
    label: 'Revenue',
    format: 'currency',
    targets: {
      2023: 2_800_000,
      2024: 3_000_000,
      2025: 3_200_000,
      2026: 3_500_000,
      2027: null,
    },
    actuals: {
      2023: 2_950_000,
      2024: 3_180_000,
      2025: 2_940_000,
      2026: 1_120_000,
      2027: 0,
    },
  },
  grossProfit: {
    label: 'Gross Profit',
    format: 'currency',
    targets: {
      2023: 750_000,
      2024: 850_000,
      2025: 900_000,
      2026: 950_000,
      2027: null,
    },
    actuals: {
      2023: 800_000,
      2024: 920_000,
      2025: 810_000,
      2026: 340_000,
      2027: 0,
    },
  },
  utilization: {
    label: 'Utilization',
    format: 'hours',
    targets: {
      2023: 1820,
      2024: 1820,
      2025: 1820,
      2026: 1820,
      2027: null,
    },
    actuals: {
      2023: 1840,
      2024: 1795,
      2025: 1680,
      2026: 412,
      2027: 0,
    },
  },
};

// ── Goals ──────────────────────────────────────────────────────────────────

export const goals = [
  {
    id: 1,
    title: 'Hit all 2026 performance targets',
    status: 'in_progress',
    targetDate: '2026-12-31',
    isGate: true,
    notes: 'Sales, Revenue, GP, and Utilization all on track by year-end.',
  },
  {
    id: 2,
    title: 'Complete all IBM training requirements',
    status: 'not_started',
    targetDate: '2026-12-31',
    isGate: true,
    notes: 'Need to confirm which courses are required for Partner candidacy.',
  },
  {
    id: 3,
    title: 'Finish 2026 rated as a top performer',
    status: 'not_started',
    targetDate: '2026-12-31',
    isGate: true,
    notes: 'Performance rating determined in Q1 2027 review.',
  },
  {
    id: 4,
    title: 'Build executive sponsor network in Ottawa',
    status: 'in_progress',
    targetDate: '2026-09-30',
    isGate: false,
    notes: 'Targeting 3 senior sponsors at TBS, DND, and SSC.',
  },
  {
    id: 5,
    title: 'Deliver a keynote or panel at an industry event',
    status: 'done',
    targetDate: '2026-03-15',
    isGate: false,
    notes: 'Presented at Canadian Government Executive forum in March.',
  },
  {
    id: 6,
    title: 'Publish 2 IBM thought leadership pieces',
    status: 'in_progress',
    targetDate: '2026-10-31',
    isGate: false,
    notes: 'One draft in progress on cloud migration for public sector.',
  },
];

// ── People ─────────────────────────────────────────────────────────────────

export const people = [
  {
    id: 1,
    name: 'Lisa Chen',
    title: 'VP, Public Sector',
    org: 'IBM Canada',
    type: 'Sponsor',
    need: 'Champion my Partner nomination with the senior leadership team',
    lastContact: '2026-03-18',
  },
  {
    id: 2,
    name: 'Ahmed Malik',
    title: 'Director General, Digital Services',
    org: 'Treasury Board Secretariat',
    type: 'Decision maker',
    need: 'Decision authority on $4M contract renewal discussion',
    lastContact: '2026-02-28',
  },
  {
    id: 3,
    name: 'Sarah Park',
    title: 'Director, Technology Enablement',
    org: 'City of Toronto',
    type: 'Client',
    need: 'Expand engagement into Phase 2 of ITSM modernization',
    lastContact: '2026-03-30',
  },
  {
    id: 4,
    name: 'Marcus Thompson',
    title: 'Partner, Public Sector',
    org: 'IBM Canada',
    type: 'Peer',
    need: 'Mentorship and nomination support from an existing Partner',
    lastContact: '2026-03-22',
  },
  {
    id: 5,
    name: 'Diane Lefebvre',
    title: 'ADM, Shared Services Canada',
    org: 'Government of Canada',
    type: 'Decision maker',
    need: 'Long-term relationship for future SSC opportunities',
    lastContact: '2026-01-15',
  },
];

// ── Wins ───────────────────────────────────────────────────────────────────

export const wins = [
  {
    id: 1,
    title: 'Secured Ontario Digital Services contract renewal',
    date: '2026-03-20',
    description:
      'Led the renewal of a $2.1M contract with Ontario Digital Services, retaining a key client through a competitive rebid process.',
    impact: '$2.1M revenue secured; relationship strengthened for Phase 2 expansion',
    tags: ['Revenue', 'Client relationship'],
  },
  {
    id: 2,
    title: 'Delivered federal ITSM modernization for City of Toronto',
    date: '2026-02-14',
    description:
      'Successfully completed a 6-month engagement modernizing ITSM processes. Delivered on time and 4% under budget.',
    impact:
      'Delivery excellence recognized by client DM; led to Phase 2 conversation worth $1.5M',
    tags: ['Delivery', 'Client relationship'],
  },
  {
    id: 3,
    title: 'Keynote speaker at Canadian Government Executive forum',
    date: '2026-03-15',
    description:
      'Delivered a 25-minute keynote on AI readiness in the Canadian public sector to an audience of 300+ federal and provincial executives.',
    impact: 'IBM brand visibility; 3 follow-up meetings with new federal contacts',
    tags: ['External eminence'],
  },
  {
    id: 4,
    title: 'Mentored 2 analysts through promotion to consultant',
    date: '2026-01-30',
    description:
      'Two direct reports successfully promoted in the Q1 cycle, both citing mentorship and stretch assignments as key factors.',
    impact: 'Team leadership demonstrated; strengthens case for executive readiness',
    tags: ['Team leadership'],
  },
  {
    id: 5,
    title: 'Led winning response to $4M TBS opportunity',
    date: '2025-11-08',
    description:
      'Directed proposal strategy and orals preparation for a $4M Treasury Board Secretariat opportunity. Won against 3 competitors.',
    impact: '$4M in new sales; new senior federal relationship established at TBS',
    tags: ['Revenue', 'Client relationship'],
  },
];

// ── Action items ───────────────────────────────────────────────────────────

export const actionItems = [
  {
    id: 1,
    title: 'Schedule Q2 check-in with Lisa Chen (VP sponsor)',
    dueDate: '2026-03-31',
    done: false,
    linkedGoalId: null,
  },
  {
    id: 2,
    title: 'Submit Q1 utilization hours in the system',
    dueDate: '2026-04-01',
    done: false,
    linkedGoalId: 1,
  },
  {
    id: 3,
    title: 'Follow up with Ahmed Malik on TBS contract discussion',
    dueDate: '2026-04-10',
    done: false,
    linkedGoalId: null,
  },
  {
    id: 4,
    title: 'Review IBM Partner criteria document with Marcus Thompson',
    dueDate: '2026-04-15',
    done: false,
    linkedGoalId: null,
  },
  {
    id: 5,
    title: 'Draft eminence article: AI in public sector procurement',
    dueDate: '2026-04-30',
    done: false,
    linkedGoalId: 6,
  },
  {
    id: 6,
    title: 'Register for IBM Leadership Academy (Q3 cohort)',
    dueDate: '2026-05-01',
    done: false,
    linkedGoalId: 2,
  },
  {
    id: 7,
    title: 'Update wins log after Ontario contract close',
    dueDate: '2026-03-25',
    done: true,
    linkedGoalId: null,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function daysSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function daysUntil(dateStr) {
  const then = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  then.setHours(0, 0, 0, 0);
  return Math.floor((then - now) / (1000 * 60 * 60 * 24));
}

export function fmtCAD(amount) {
  if (amount >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (amount >= 1_000)
    return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
