// __tests__/buildContext.test.js
// Tests for AI context assembly — verifies data transformation, validation, and output shape.

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://unused';

jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');

const { buildContext } = require('../ai/buildContext');

beforeEach(() => {
  jest.clearAllMocks();
});

function mockDomains(domains) {
  const rows = Object.entries(domains).map(([domain, data]) => ({ domain, data }));
  db.query.mockResolvedValueOnce({ rows });
}

const MINIMAL_ADMIN = {
  anthropicKey: 'sk-ant-test',
  ibmCriteria: 'Some criteria text',
};

describe('buildContext', () => {
  test('throws NO_KEY when anthropicKey is missing', async () => {
    mockDomains({ admin: { ibmCriteria: 'text' } });
    await expect(buildContext(1)).rejects.toMatchObject({ code: 'NO_KEY' });
  });

  test('throws NO_CRITERIA when ibmCriteria is missing', async () => {
    mockDomains({ admin: { anthropicKey: 'sk-ant-test' } });
    await expect(buildContext(1)).rejects.toMatchObject({ code: 'NO_CRITERIA' });
  });

  test('returns valid context with minimal data', async () => {
    mockDomains({ admin: MINIMAL_ADMIN });

    const ctx = await buildContext(1);

    expect(ctx.anthropicKey).toBe('sk-ant-test');
    expect(ctx.ibm_criteria).toBe('Some criteria text');
    expect(ctx.user_context.current_role).toBe('Associate Partner');
    expect(ctx.user_context.target_role).toBe('Partner');
    expect(ctx.scorecard.years).toEqual([]);
  });

  test('uses promotionYear from settings', async () => {
    mockDomains({
      admin: MINIMAL_ADMIN,
      settings: { promotionYear: 2028 },
    });

    const ctx = await buildContext(1);
    expect(ctx.user_context.target_year).toBe(2028);
    expect(ctx.user_context.qualifying_year).toBe(2027);
  });

  test('defaults promotionYear to 2027', async () => {
    mockDomains({ admin: MINIMAL_ADMIN });

    const ctx = await buildContext(1);
    expect(ctx.user_context.target_year).toBe(2027);
    expect(ctx.user_context.qualifying_year).toBe(2026);
  });

  test('limits wins to 20 most recent', async () => {
    const wins = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      title: `Win ${i}`,
      date: `2026-${String(i + 1).padStart(2, '0')}-01`,
    }));
    mockDomains({ admin: MINIMAL_ADMIN, wins });

    const ctx = await buildContext(1);
    expect(ctx.wins).toHaveLength(20);
  });

  test('excludes lost opportunities from context', async () => {
    mockDomains({
      admin: MINIMAL_ADMIN,
      scorecard: {
        targets: {},
        opportunities: [
          { name: 'Won deal', year: 2026, status: 'won', signingsValue: '100' },
          { name: 'Lost deal', year: 2026, status: 'lost', signingsValue: '200' },
          { name: 'Open deal', year: 2026, status: 'open', signingsValue: '300' },
        ],
        projects: [],
        utilization: {},
      },
    });

    const ctx = await buildContext(1);
    expect(ctx.opportunities).toHaveLength(2);
    expect(ctx.opportunities.map(o => o.name)).toEqual(['Won deal', 'Open deal']);
  });

  test('converts camelCase fields to snake_case in opportunities', async () => {
    mockDomains({
      admin: MINIMAL_ADMIN,
      scorecard: {
        targets: {},
        opportunities: [{
          name: 'Test', year: 2026, status: 'open',
          signingsValue: '500', dealType: 'multi-year', logoType: 'net-new',
          relationshipOrigin: 'referral', strategicNote: 'note',
        }],
        projects: [],
        utilization: {},
      },
    });

    const ctx = await buildContext(1);
    const opp = ctx.opportunities[0];
    expect(opp.signings_value).toBe(500);
    expect(opp.deal_type).toBe('multi-year');
    expect(opp.logo_type).toBe('net-new');
    expect(opp.relationship_origin).toBe('referral');
    expect(opp.strategic_note).toBe('note');
  });

  test('formats goal status as title case', async () => {
    mockDomains({
      admin: MINIMAL_ADMIN,
      goals: [
        { title: 'G1', status: 'not_started', isGate: false },
        { title: 'G2', status: 'in_progress', isGate: true },
        { title: 'G3', status: 'done', isGate: false },
      ],
    });

    const ctx = await buildContext(1);
    expect(ctx.goals[0].status).toBe('Not Started');
    expect(ctx.goals[1].status).toBe('In Progress');
    expect(ctx.goals[1].is_gate).toBe(true);
    expect(ctx.goals[2].status).toBe('Done');
  });

  test('computes _stats correctly', async () => {
    mockDomains({
      admin: MINIMAL_ADMIN,
      scorecard: {
        targets: { 2026: { sales: 1000000 } },
        opportunities: [
          { name: 'A', year: 2026, status: 'won', signingsValue: '500000', logoType: 'net-new' },
          { name: 'B', year: 2026, status: 'won', signingsValue: '200000', logoType: 'expansion' },
          { name: 'C', year: 2026, status: 'lost', signingsValue: '100000', logoType: 'net-new' },
          { name: 'D', year: 2026, status: 'open', signingsValue: '300000', probability: 80 },
        ],
        projects: [],
        utilization: {},
      },
    });

    const ctx = await buildContext(1);
    expect(ctx._stats.net_new_won_count).toBe(1);
    expect(ctx._stats.expansion_won_count).toBe(1);
    expect(ctx._stats.win_rate).toBe(67); // 2 won / 3 (won+lost) = 67%
    expect(ctx._stats.weighted_pipeline).toBe(240000); // 300000 * 0.8
    expect(ctx._stats.total_pipeline).toBe(300000);
  });

  test('removes null values from output', async () => {
    mockDomains({
      admin: MINIMAL_ADMIN,
      wins: [{ id: '1', title: 'W', date: '2026-01-01', impact: null, tags: [] }],
    });

    const ctx = await buildContext(1);
    // impact was null — should be stripped
    expect(ctx.wins[0]).not.toHaveProperty('impact');
  });

  test('includes career_history when present', async () => {
    mockDomains({
      admin: { ...MINIMAL_ADMIN, careerHistory: '10 years at IBM' },
    });

    const ctx = await buildContext(1);
    expect(ctx.career_history).toBe('10 years at IBM');
  });

  test('excludes career_history when absent', async () => {
    mockDomains({ admin: MINIMAL_ADMIN });

    const ctx = await buildContext(1);
    expect(ctx).not.toHaveProperty('career_history');
  });
});
