// notifications/digest.js
// Builds the weekly digest HTML email for a single user.

const db = require('../db');
const { computeReadinessScore, DEFAULT_WEIGHTS } = require('./readiness');

const APP_URL = process.env.APP_URL || 'https://partner.jordandf.com';

/**
 * Build weekly digest for a user.
 * @param {number} userId
 * @returns {Promise<{subject: string, html: string}>}
 */
async function buildDigest(userId) {
  // Load all relevant domains
  const result = await db.query(
    `SELECT domain, data FROM user_data WHERE user_id = $1 AND domain = ANY($2)`,
    [userId, ['scorecard', 'wins', 'goals', 'people', 'actions', 'eminence', 'admin', 'settings', 'story']]
  );
  const byDomain = Object.fromEntries(result.rows.map(r => [r.domain, r.data]));

  const scorecardData = byDomain.scorecard || { targets: {}, opportunities: [], projects: [], utilization: {} };
  const wins = byDomain.wins || [];
  const goals = byDomain.goals || [];
  const people = byDomain.people || [];
  const actions = byDomain.actions || [];
  const eminenceActivities = (byDomain.eminence || {}).activities || [];
  const adminData = byDomain.admin || {};
  const settings = byDomain.settings || {};
  const storyData = byDomain.story || {};

  const promotionYear = settings.promotionYear || 2027;
  const qualifyingYear = promotionYear - 1;
  const today = new Date().toISOString().split('T')[0];

  // ── Compute stats ──
  const overdueActions = actions.filter(a => !a.done && a.dueDate && a.dueDate < today);

  const staleContacts = people.filter(p => {
    if (!p.touchpoints || p.touchpoints.length === 0) return true;
    const latest = [...p.touchpoints].sort((a, b) => b.date.localeCompare(a.date))[0];
    const daysSince = Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 30;
  });

  const upcomingGoals = goals.filter(g => {
    if (!g.targetDate || g.status === 'done') return false;
    const diff = Math.floor((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 14;
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentWins = wins.filter(w => w.date >= sevenDaysAgo);

  // Readiness score
  const gapAnalysis = storyData.gap_analysis?.data || [];
  const readiness = computeReadinessScore({
    scorecardData, goals, wins, gapAnalysis, eminenceActivities,
    weights: adminData.readinessWeights || DEFAULT_WEIGHTS,
    qualifyingYear,
  });

  // Scorecard summary for qualifying year
  const targets = scorecardData.targets || {};
  const qyTargets = targets[qualifyingYear] || {};
  const opps = scorecardData.opportunities || [];
  const wonSignings = opps.filter(o => o.year === qualifyingYear && o.status === 'won')
    .reduce((s, o) => s + (Number(o.signingsValue) || 0), 0);
  const salesTarget = qyTargets.sales || 0;

  // ── Build HTML ──
  const subject = `Weekly Digest — Readiness ${readiness.overall}%`;

  const sections = [];

  // Readiness
  sections.push(`
    <div style="background:#f0f4ff;border-radius:8px;padding:16px 20px;margin-bottom:20px;text-align:center;">
      <div style="font-size:36px;font-weight:700;color:#0040a0;">${readiness.overall}%</div>
      <div style="font-size:14px;color:#555;margin-top:4px;">Promotion Readiness</div>
    </div>
  `);

  // Dimensions
  const dimRows = Object.values(readiness.dimensions).map(d =>
    `<tr><td style="padding:4px 8px;font-size:13px;">${d.label}</td><td style="padding:4px 8px;font-size:13px;font-weight:600;text-align:right;">${d.score}%</td></tr>`
  ).join('');
  sections.push(`
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead><tr><th style="text-align:left;padding:4px 8px;font-size:12px;color:#888;border-bottom:1px solid #ddd;">Dimension</th><th style="text-align:right;padding:4px 8px;font-size:12px;color:#888;border-bottom:1px solid #ddd;">Score</th></tr></thead>
      <tbody>${dimRows}</tbody>
    </table>
  `);

  // Scorecard highlight
  if (salesTarget > 0) {
    const pct = Math.round((wonSignings / salesTarget) * 100);
    sections.push(makeSection('Scorecard', `Qualifying year signings: $${fmtNum(wonSignings)} of $${fmtNum(salesTarget)} target (${pct}%)`));
  }

  // Overdue actions
  if (overdueActions.length > 0) {
    const items = overdueActions.slice(0, 5).map(a => `• ${a.title} (due ${a.dueDate})`).join('<br>');
    sections.push(makeSection(
      `Overdue Actions (${overdueActions.length})`,
      items + (overdueActions.length > 5 ? `<br><span style="color:#888;">...and ${overdueActions.length - 5} more</span>` : '')
    ));
  }

  // Stale contacts
  if (staleContacts.length > 0) {
    const items = staleContacts.slice(0, 5).map(p => `• ${p.name}${p.org ? ` (${p.org})` : ''}`).join('<br>');
    sections.push(makeSection(
      `Stale Contacts (${staleContacts.length})`,
      `Not reached in 30+ days:<br>${items}`
    ));
  }

  // Upcoming goals
  if (upcomingGoals.length > 0) {
    const items = upcomingGoals.map(g => `• ${g.title} — due ${g.targetDate}`).join('<br>');
    sections.push(makeSection('Upcoming Goal Deadlines', items));
  }

  // Recent wins
  if (recentWins.length > 0) {
    const items = recentWins.map(w => `• ${w.title}`).join('<br>');
    sections.push(makeSection(`Wins This Week (${recentWins.length})`, items));
  }

  // If nothing notable
  if (overdueActions.length === 0 && staleContacts.length === 0 && upcomingGoals.length === 0 && recentWins.length === 0) {
    sections.push(makeSection('All Clear', 'No overdue items, stale contacts, or upcoming deadlines. Keep up the momentum!'));
  }

  const html = wrapEmail(sections.join(''));

  return { subject, html };
}

function makeSection(title, body) {
  return `
    <div style="margin-bottom:20px;">
      <div style="font-size:14px;font-weight:700;color:#0040a0;margin-bottom:6px;">${title}</div>
      <div style="font-size:13px;color:#333;line-height:1.6;">${body}</div>
    </div>
  `;
}

function fmtNum(n) {
  return Number(n).toLocaleString('en-CA', { maximumFractionDigits: 0 });
}

function wrapEmail(body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0040a0;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;text-align:center;">
      <div style="font-size:18px;font-weight:700;">Promotion Tracker</div>
      <div style="font-size:12px;opacity:0.8;margin-top:2px;">Weekly Digest</div>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      ${body}
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}" style="display:inline-block;background:#0040a0;color:#fff;padding:10px 24px;border-radius:5px;text-decoration:none;font-size:14px;font-weight:600;">Open Promotion Tracker</a>
      </div>
    </div>
    <div style="text-align:center;padding:16px;font-size:11px;color:#999;">
      You're receiving this because email notifications are enabled in your account settings.
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildDigest };
