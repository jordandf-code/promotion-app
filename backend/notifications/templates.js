// notifications/templates.js
// HTML email builders for the 4 proactive notification types.

const { wrapEmail, APP_URL } = require('./emailTemplate');

function overdueActionEmail(overdueItems) {
  const count = overdueItems.length;
  const list = overdueItems.slice(0, 8).map(a =>
    `<li style="margin-bottom:6px;">${a.title} <span style="color:#999;font-size:12px;">(due ${a.dueDate})</span></li>`
  ).join('');
  const more = count > 8 ? `<p style="color:#999;font-size:13px;">...and ${count - 8} more</p>` : '';

  return {
    subject: `You have ${count} overdue action item${count !== 1 ? 's' : ''}`,
    html: wrapEmail(
      `<h2 style="margin:0 0 12px;font-size:16px;">Overdue action items</h2>
       <p style="margin:0 0 12px;color:#333;">You have <strong>${count}</strong> action item${count !== 1 ? 's' : ''} past their due date:</p>
       <ul style="padding-left:20px;margin:0 0 8px;">${list}</ul>
       ${more}`,
      { subtitle: 'Action Items', ctaLabel: 'View action items', ctaUrl: `${APP_URL}/actions` }
    ),
  };
}

function staleContactEmail(staleContacts) {
  const count = staleContacts.length;
  const list = staleContacts.slice(0, 8).map(c =>
    `<li style="margin-bottom:6px;">${c.name}${c.org ? ` (${c.org})` : ''} <span style="color:#999;font-size:12px;">— last contact ${c.lastTouchpoint || 'never'}</span></li>`
  ).join('');
  const more = count > 8 ? `<p style="color:#999;font-size:13px;">...and ${count - 8} more</p>` : '';

  return {
    subject: `${count} key contact${count !== 1 ? 's' : ''} need${count === 1 ? 's' : ''} a touchpoint`,
    html: wrapEmail(
      `<h2 style="margin:0 0 12px;font-size:16px;">Stale key contacts</h2>
       <p style="margin:0 0 12px;color:#333;"><strong>${count}</strong> key contact${count !== 1 ? 's' : ''} haven't been touched in 30+ days:</p>
       <ul style="padding-left:20px;margin:0 0 8px;">${list}</ul>
       ${more}`,
      { subtitle: 'People', ctaLabel: 'View people', ctaUrl: `${APP_URL}/people` }
    ),
  };
}

function goalDeadlineEmail(approachingGoals) {
  const count = approachingGoals.length;
  const list = approachingGoals.slice(0, 8).map(g =>
    `<li style="margin-bottom:6px;">${g.title} <span style="color:#999;font-size:12px;">(due ${g.targetDate})</span></li>`
  ).join('');

  return {
    subject: `${count} goal${count !== 1 ? 's' : ''} due within 7 days`,
    html: wrapEmail(
      `<h2 style="margin:0 0 12px;font-size:16px;">Goals approaching deadline</h2>
       <p style="margin:0 0 12px;color:#333;"><strong>${count}</strong> goal${count !== 1 ? 's' : ''} ${count === 1 ? 'is' : 'are'} due within the next 7 days:</p>
       <ul style="padding-left:20px;margin:0 0 8px;">${list}</ul>`,
      { subtitle: 'Goals', ctaLabel: 'View goals', ctaUrl: `${APP_URL}/goals` }
    ),
  };
}

function scorecardAtRiskEmail(atRiskMetrics) {
  const count = atRiskMetrics.length;
  const list = atRiskMetrics.map(m =>
    `<li style="margin-bottom:6px;">${m.label}: <strong>${m.pct}%</strong> of target <span style="color:#999;font-size:12px;">(${m.monthsRemaining} month${m.monthsRemaining !== 1 ? 's' : ''} remaining)</span></li>`
  ).join('');

  return {
    subject: `${count} scorecard metric${count !== 1 ? 's' : ''} below 50% of target`,
    html: wrapEmail(
      `<h2 style="margin:0 0 12px;font-size:16px;">Scorecard at risk</h2>
       <p style="margin:0 0 12px;color:#333;"><strong>${count}</strong> metric${count !== 1 ? 's' : ''} ${count === 1 ? 'is' : 'are'} below 50% of target with limited time remaining:</p>
       <ul style="padding-left:20px;margin:0 0 8px;">${list}</ul>`,
      { subtitle: 'Scorecard', ctaLabel: 'View scorecard', ctaUrl: `${APP_URL}/scorecard` }
    ),
  };
}

module.exports = { overdueActionEmail, staleContactEmail, goalDeadlineEmail, scorecardAtRiskEmail };
