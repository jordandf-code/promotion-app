// routes/export.js
// Bulk export: GET /api/export → ZIP of all domains as CSVs
// GET /api/export/:domain → single-domain CSV download

const express        = require('express');
const db             = require('../db');
const authMiddleware = require('../middleware/auth');
const JSZip          = require('jszip');

const router = express.Router();

// ── Domain → CSV mapping ─────────────────────────────────────────────────

const EXPORT_DOMAINS = [
  'scorecard', 'wins', 'goals', 'actions', 'people', 'learning', 'eminence',
];

// Flatten a domain's JSONB into one or more { filename, rows } entries.
function domainToCSVs(domain, data) {
  if (!data) return [];

  switch (domain) {
    case 'scorecard': {
      const opps = (data.opportunities || []).map(o => ({
        id: o.id, name: o.name, client: o.client, year: o.year,
        status: o.status, winDate: o.winDate || '',
        totalValue: o.totalValue ?? '', signingsValue: o.signingsValue ?? '',
        stage: o.stage || '', probability: o.probability ?? '',
        expectedClose: o.expectedClose || '', dealType: o.dealType || '',
        logoType: o.logoType || '', relationshipOrigin: o.relationshipOrigin || '',
        strategicNote: o.strategicNote || '',
      }));
      const projects = (data.projects || []).map(p => ({
        id: p.id, name: p.name, client: p.client, year: p.year,
        status: p.status, opportunityId: p.opportunityId || '',
        revenueQ1: p.revenue?.q1 ?? '', revenueQ2: p.revenue?.q2 ?? '',
        revenueQ3: p.revenue?.q3 ?? '', revenueQ4: p.revenue?.q4 ?? '',
        grossProfitQ1: p.grossProfit?.q1 ?? '', grossProfitQ2: p.grossProfit?.q2 ?? '',
        grossProfitQ3: p.grossProfit?.q3 ?? '', grossProfitQ4: p.grossProfit?.q4 ?? '',
      }));
      const result = [];
      if (opps.length)     result.push({ filename: 'opportunities.csv', rows: opps });
      if (projects.length) result.push({ filename: 'projects.csv', rows: projects });
      return result;
    }

    case 'wins':
      return [{ filename: 'wins.csv', rows: (data || []).map(w => ({
        id: w.id, title: w.title, date: w.date || '', description: w.description || '',
        impact: w.impact || '', tags: (w.tags || []).join('|'),
        sourceType: w.sourceType || '', sourceId: w.sourceId || '',
        sourceName: w.sourceName || '',
        logoType: w.logoType || '', relationshipOrigin: w.relationshipOrigin || '',
        strategicNote: w.strategicNote || '',
      })) }];

    case 'goals':
      return [{ filename: 'goals.csv', rows: (data || []).map(g => ({
        id: g.id, title: g.title, targetDate: g.targetDate || '',
        status: g.status || '', notes: g.notes || '', isGate: g.isGate ? 'yes' : 'no',
      })) }];

    case 'actions':
      return [{ filename: 'actions.csv', rows: (data || []).map(a => ({
        id: a.id, title: a.title, dueDate: a.dueDate || '',
        done: a.done ? 'yes' : 'no',
        linkedGoalIds: (a.linkedGoalIds || []).join('|'),
      })) }];

    case 'people': {
      const people = (data || []).map(p => ({
        id: p.id, name: p.name, title: p.title || '', org: p.org || '',
        type: p.type || '', relationshipStatus: p.relationshipStatus || '',
        email: p.email || '', phone: p.phone || '', need: p.need || '',
        influenceTier: p.influenceTier || '', strategicImportance: p.strategicImportance || '',
        stakeholderGroup: p.stakeholderGroup || '',
      }));
      const touchpoints = [];
      for (const p of (data || [])) {
        for (const t of (p.touchpoints || [])) {
          touchpoints.push({
            person_id: p.id, person_name: p.name,
            date: t.date || '', type: t.type || '', note: t.note || '',
          });
        }
      }
      const result = [];
      if (people.length) result.push({ filename: 'people.csv', rows: people });
      if (touchpoints.length) result.push({ filename: 'touchpoints.csv', rows: touchpoints });
      return result;
    }

    case 'learning': {
      const certs = (data.certifications || []).map(c => ({
        id: c.id, name: c.name, issuer: c.issuer || '', status: c.status || '',
        dateEarned: c.dateEarned || '', expiryDate: c.expiryDate || '',
        credentialId: c.credentialId || '', badgeUrl: c.badgeUrl || '',
        notes: c.notes || '',
      }));
      const courses = (data.courses || []).map(c => ({
        id: c.id, title: c.title, provider: c.provider || '', status: c.status || '',
        dateCompleted: c.dateCompleted || '', hours: c.hours ?? '', notes: c.notes || '',
      }));
      const result = [];
      if (certs.length)   result.push({ filename: 'learning_certifications.csv', rows: certs });
      if (courses.length) result.push({ filename: 'learning_courses.csv', rows: courses });
      return result;
    }

    case 'eminence':
      return [{ filename: 'eminence.csv', rows: (data.activities || []).map(a => ({
        id: a.id, title: a.title, type: a.type || '', date: a.date || '',
        venue: a.venue || '', audience: a.audience || '', reach: a.reach ?? '',
        url: a.url || '', description: a.description || '',
        tags: (a.tags || []).join('|'), year: a.year ?? '',
      })) }];

    default:
      return [];
  }
}

// Convert array of objects to CSV string
function rowsToCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = v => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

const README_TEXT = `Career Command Center — Data Export
====================================

This ZIP contains your data exported as CSV files.

Files included:
- opportunities.csv — Pipeline opportunities (from Scorecard)
- projects.csv — Delivery projects (from Scorecard)
- wins.csv — Accomplishments and wins
- goals.csv — Career goals
- actions.csv — Action items / to-dos
- people.csv — Contacts and relationships
- touchpoints.csv — Interaction log (linked to people via person_id)
- eminence.csv — Thought leadership activities
- learning_certifications.csv — Professional certifications
- learning_courses.csv — Training and courses

Notes:
- All currency values are in CAD (Canadian dollars), regardless of your display setting.
- Tags and multi-value fields use pipe (|) as separator.
- Boolean fields use "yes"/"no".
- Dates are in YYYY-MM-DD format where available.
- IDs are internal identifiers; they are included for reference but not required for import.
`;

// ── Routes ───────────────────────────────────────────────────────────────

// GET /api/export — full ZIP
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)',
      [req.userId, EXPORT_DOMAINS]
    );

    const dataByDomain = {};
    for (const row of result.rows) {
      dataByDomain[row.domain] = row.data;
    }

    const zip = new JSZip();
    zip.file('README.txt', README_TEXT);

    for (const domain of EXPORT_DOMAINS) {
      const csvEntries = domainToCSVs(domain, dataByDomain[domain]);
      for (const { filename, rows } of csvEntries) {
        if (rows.length) {
          zip.file(filename, rowsToCSV(rows));
        }
      }
    }

    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="career-command-center-export-${date}.zip"`,
    });
    res.send(buf);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/export/:domain — single CSV
router.get('/:domain', authMiddleware, async (req, res) => {
  const { domain } = req.params;
  if (!EXPORT_DOMAINS.includes(domain)) {
    return res.status(400).json({ error: 'Unknown export domain' });
  }

  try {
    const result = await db.query(
      'SELECT data FROM user_data WHERE user_id = $1 AND domain = $2',
      [req.userId, domain]
    );

    const data = result.rows[0]?.data;
    const csvEntries = domainToCSVs(domain, data);

    if (!csvEntries.length || !csvEntries[0].rows.length) {
      return res.status(200).set('Content-Type', 'text/csv').send('');
    }

    // For domains with multiple CSVs (scorecard, learning, people), return a ZIP
    if (csvEntries.length > 1) {
      const zip = new JSZip();
      for (const { filename, rows } of csvEntries) {
        if (rows.length) zip.file(filename, rowsToCSV(rows));
      }
      const buf = await zip.generateAsync({ type: 'nodebuffer' });
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${domain}-export.zip"`,
      });
      return res.send(buf);
    }

    const csv = rowsToCSV(csvEntries[0].rows);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${csvEntries[0].filename}"`,
    });
    res.send(csv);
  } catch (err) {
    console.error(`Export ${domain} error:`, err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
