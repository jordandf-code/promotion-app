// ai/packageAssembly.js
// Pure data assembly for promotion package sections.
// No AI calls — transforms user data into structured raw text for each section.

const { fmtCurrency } = require('./formatUtils');

function assemblePackage(ctx, extras) {
  // ctx = buildContext result (has: scorecard, wins, goals, people, eminence, learning,
  //   competency_self_assessment, feedback_360, brand, gap_analysis, polished_narrative, plan_2027,
  //   user_context, promotion_criteria, _stats)
  // extras = { readiness, competencies, allWins }

  const sections = {};

  sections.executive_summary    = assembleExecutiveSummary(ctx, extras);
  sections.scorecard_performance = assembleScorecardPerformance(ctx);
  sections.pipeline_outlook     = assemblePipelineOutlook(ctx);
  sections.key_wins             = assembleKeyWins(ctx, extras);
  sections.competency_assessment = assembleCompetencyAssessment(ctx, extras);
  sections.brand_positioning    = assembleBrandPositioning(ctx);
  sections.readiness_assessment = assembleReadinessAssessment(extras);
  sections.eminence_leadership  = assembleEminenceLeadership(ctx);
  sections.learning_development = assembleLearningDevelopment(ctx);
  sections.people_network       = assemblePeopleNetwork(ctx);
  sections.the_ask              = assembleTheAsk(ctx);

  return sections;
}

// ── Section assemblers ──────────────────────────────────────────────────────

function assembleExecutiveSummary(ctx, extras) {
  const parts = [];
  const uc = ctx.user_context ?? {};

  parts.push(`EXECUTIVE SUMMARY`);
  parts.push(`Candidate: ${uc.current_role ?? 'N/A'} at ${uc.company ?? 'N/A'}`);
  parts.push(`Target: ${uc.target_role ?? 'N/A'} — ${uc.target_year ?? 'N/A'}`);
  parts.push('');

  // Polished narrative as primary content
  if (ctx.polished_narrative) {
    parts.push(ctx.polished_narrative);
    parts.push('');
  } else {
    parts.push('(No polished narrative available — generate one in the Narrative tab first)');
    parts.push('');
  }

  // Readiness overall score
  const readiness = extras.readiness;
  if (readiness && readiness.snapshots && readiness.snapshots.length) {
    const latest = readiness.snapshots[readiness.snapshots.length - 1];
    if (latest.overall != null) {
      parts.push(`Overall readiness score: ${latest.overall}/100`);
    }
  }

  // Brand tagline
  if (ctx.brand && ctx.brand.tagline) {
    parts.push(`Brand positioning: ${ctx.brand.tagline}`);
  }

  return parts.join('\n');
}

function assembleScorecardPerformance(ctx) {
  const parts = [];
  parts.push('SCORECARD PERFORMANCE');
  parts.push('');

  const years = ctx.scorecard?.years ?? [];
  if (!years.length) {
    parts.push('(No scorecard data available — enter your targets and actuals in the Scorecard tab)');
    return parts.join('\n');
  }

  for (const y of years) {
    parts.push(`--- ${y.year} (${y.status}) ---`);
    const m = y.metrics;

    const sig = m.signings;
    if (sig.target) {
      const total = (sig.actual || 0) + (sig.forecast || 0);
      parts.push(`Signings: ${fmtCurrency(total)} of ${fmtCurrency(sig.target)} target (${sig.pct ?? 0}%)`);
    }

    const rev = m.revenue;
    if (rev.target) {
      const total = (rev.actual || 0) + (rev.forecast || 0);
      parts.push(`Revenue: ${fmtCurrency(total)} of ${fmtCurrency(rev.target)} target (${rev.pct ?? 0}%)`);
    }

    const gp = m.gross_profit;
    if (gp.target) {
      const total = (gp.actual || 0) + (gp.forecast || 0);
      parts.push(`Gross profit: ${fmtCurrency(total)} of ${fmtCurrency(gp.target)} target (${gp.pct ?? 0}%)`);
    }

    const util = m.utilization;
    if (util.target_hours) {
      parts.push(`Utilization: ${util.projected_hours ?? 0}h of ${util.target_hours}h target (${util.pct_of_target ?? 0}%)`);
    }

    parts.push('');
  }

  // Stats
  const st = ctx._stats;
  if (st) {
    if (st.net_new_won_count != null) parts.push(`Net new wins: ${st.net_new_won_count}`);
    if (st.expansion_won_count != null) parts.push(`Expansion wins: ${st.expansion_won_count}`);
    if (st.win_rate != null) parts.push(`Win rate: ${st.win_rate}%`);
  }

  return parts.join('\n');
}

function assemblePipelineOutlook(ctx) {
  const parts = [];
  parts.push('PIPELINE OUTLOOK');
  parts.push('');

  const opps = (ctx.opportunities ?? []).filter(o => o.status === 'open');
  if (!opps.length) {
    parts.push('(No open opportunities — add pipeline in the Scorecard tab)');
    return parts.join('\n');
  }

  // Sort by signings credit desc
  const sorted = [...opps].sort((a, b) => (b.signings_credit || 0) - (a.signings_credit || 0));

  for (const o of sorted) {
    const prob = o.probability != null ? `${o.probability}%` : 'TBD';
    parts.push(`- ${o.name} (${o.client ?? 'N/A'}): ${fmtCurrency(o.signings_credit || 0)} signings, ${prob} probability, stage: ${o.stage ?? 'N/A'}`);
    if (o.logo_type) parts.push(`  Logo type: ${o.logo_type}`);
    if (o.strategic_note) parts.push(`  Context: ${o.strategic_note}`);
  }

  parts.push('');
  const st = ctx._stats;
  if (st) {
    if (st.weighted_pipeline != null) parts.push(`Weighted pipeline total: ${fmtCurrency(st.weighted_pipeline)}`);
    if (st.total_pipeline != null) parts.push(`Total pipeline: ${fmtCurrency(st.total_pipeline)}`);
    if (st.largest_pursuit) parts.push(`Largest pursuit: ${st.largest_pursuit.name ?? 'N/A'}`);
  }

  return parts.join('\n');
}

function assembleKeyWins(ctx, extras) {
  const parts = [];
  parts.push('KEY WINS');
  parts.push('');

  const allWins = extras.allWins ?? [];
  if (!allWins.length) {
    parts.push('(No wins recorded — log wins in the Wins tab)');
    return parts.join('\n');
  }

  // Sort by date desc, limit to 15
  const sorted = [...allWins]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 15);

  for (const w of sorted) {
    parts.push(`--- ${w.title} (${w.date ?? 'undated'}) ---`);
    if (w.enhanced) {
      if (w.enhanced.statement) parts.push(w.enhanced.statement);
      if (Array.isArray(w.enhanced.bullets)) {
        w.enhanced.bullets.forEach(b => parts.push(`  - ${b}`));
      }
    } else {
      if (w.impact) parts.push(`Impact: ${w.impact}`);
      if (w.description) parts.push(`Description: ${w.description}`);
    }
    if (w.tags && w.tags.length) parts.push(`Tags: ${w.tags.join(', ')}`);
    if (w.logoType) parts.push(`Logo: ${w.logoType}`);
    parts.push('');
  }

  return parts.join('\n');
}

function assembleCompetencyAssessment(ctx, extras) {
  const parts = [];
  parts.push('COMPETENCY ASSESSMENT');
  parts.push('');

  const assessment = ctx.competency_self_assessment;
  if (!assessment || !assessment.ratings) {
    parts.push('(No competency self-assessment — complete one in the Competencies tab)');
    return parts.join('\n');
  }

  const LABELS = {
    commercial_acumen: 'Commercial acumen',
    client_relationship: 'Client relationship',
    leadership: 'Leadership & people',
    practice_building: 'Practice building',
    executive_presence: 'Executive presence',
    strategic_thinking: 'Strategic thinking',
    delivery_excellence: 'Delivery excellence',
  };

  const LEVELS = { 1: 'Developing', 2: 'Competent', 3: 'Advanced', 4: 'Exemplary' };

  parts.push(`Assessment date: ${assessment.date ?? 'N/A'}`);
  parts.push('');

  for (const [key, rating] of Object.entries(assessment.ratings)) {
    const label = LABELS[key] ?? key;
    const level = LEVELS[rating] ?? `Level ${rating}`;
    parts.push(`${label}: ${level} (${rating}/4)`);
  }

  if (assessment.overall_notes) {
    parts.push('');
    parts.push(`Notes: ${assessment.overall_notes}`);
  }

  // AI analysis if available
  const comp = extras.competencies;
  if (comp && comp.ai_analysis) {
    const ai = comp.ai_analysis;
    if (ai.perception_gaps && ai.perception_gaps.length) {
      parts.push('');
      parts.push('Perception gaps:');
      for (const pg of ai.perception_gaps) {
        parts.push(`- ${pg.competency}: ${pg.gap_type} (evidence: ${pg.evidence_strength}) — ${pg.insight}`);
      }
    }
    if (ai.focus_areas && ai.focus_areas.length) {
      parts.push('');
      parts.push('Focus areas:');
      for (const fa of ai.focus_areas) {
        parts.push(`- ${fa.competency} (${fa.priority}): ${fa.rationale}`);
      }
    }
    if (ai.competency_summary) {
      parts.push('');
      parts.push(`Summary: ${ai.competency_summary}`);
    }
  }

  return parts.join('\n');
}

function assembleBrandPositioning(ctx) {
  const parts = [];
  parts.push('BRAND POSITIONING');
  parts.push('');

  const brand = ctx.brand;
  if (!brand || (!brand.tagline && !brand.positioning && !(brand.key_messages || []).length)) {
    parts.push('(No brand data available — build your brand in the Brand tab)');
    return parts.join('\n');
  }

  if (brand.tagline) parts.push(`Tagline: ${brand.tagline}`);
  if (brand.positioning) parts.push(`Positioning: ${brand.positioning}`);
  parts.push('');

  if (brand.key_messages && brand.key_messages.length) {
    parts.push('Key messages:');
    for (const m of brand.key_messages) {
      parts.push(`- [${m.category ?? 'general'}] ${m.message}`);
    }
    parts.push('');
  }

  if (brand.proof_points && brand.proof_points.length) {
    parts.push('Proof points:');
    for (const p of brand.proof_points) {
      parts.push(`- ${p.claim}${p.evidence_summary ? ': ' + p.evidence_summary : ''}`);
    }
  }

  return parts.join('\n');
}

function assembleReadinessAssessment(extras) {
  const parts = [];
  parts.push('READINESS ASSESSMENT');
  parts.push('');

  const readiness = extras.readiness;
  if (!readiness || !readiness.snapshots || !readiness.snapshots.length) {
    parts.push('(No readiness data available — generate a gap analysis first to build readiness scores)');
    return parts.join('\n');
  }

  const latest = readiness.snapshots[readiness.snapshots.length - 1];
  parts.push(`Snapshot date: ${latest.date ?? 'N/A'}`);
  if (latest.overall != null) parts.push(`Overall readiness: ${latest.overall}/100`);
  parts.push('');

  if (latest.dimensions && Array.isArray(latest.dimensions)) {
    for (const dim of latest.dimensions) {
      parts.push(`${dim.label ?? dim.key}: ${dim.score ?? 0}/100 (weight: ${dim.weight ?? 0}%)`);
    }
  }

  return parts.join('\n');
}

function assembleEminenceLeadership(ctx) {
  const parts = [];
  parts.push('EMINENCE & LEADERSHIP');
  parts.push('');

  const eminence = ctx.eminence;
  if (!eminence || !eminence.length) {
    parts.push('(No eminence activities — log speaking, publishing, and thought leadership in the Eminence tab)');
    return parts.join('\n');
  }

  for (const e of eminence) {
    const typePart = e.type ? ` [${e.type}]` : '';
    const datePart = e.date ? ` (${e.date})` : '';
    const venuePart = e.venue ? ` at ${e.venue}` : '';
    const audiencePart = e.audience ? ` — audience: ${e.audience}` : '';
    parts.push(`- ${e.title}${typePart}${datePart}${venuePart}${audiencePart}`);
  }

  return parts.join('\n');
}

function assembleLearningDevelopment(ctx) {
  const parts = [];
  parts.push('LEARNING & DEVELOPMENT');
  parts.push('');

  const learning = ctx.learning;
  if (!learning || (!(learning.certifications || []).length && !(learning.courses || []).length)) {
    parts.push('(No learning data — track certifications and courses in the Learning tab)');
    return parts.join('\n');
  }

  if (learning.certifications && learning.certifications.length) {
    parts.push('Certifications:');
    for (const c of learning.certifications) {
      const status = c.status ?? 'unknown';
      const date = c.date_earned ? ` (earned: ${c.date_earned})` : '';
      const expiry = c.expiry_date ? ` — expires: ${c.expiry_date}` : '';
      const issuer = c.issuer ? ` [${c.issuer}]` : '';
      parts.push(`- ${c.name}${issuer} — ${status}${date}${expiry}`);
    }
    parts.push('');
  }

  if (learning.courses && learning.courses.length) {
    parts.push('Courses:');
    for (const c of learning.courses) {
      const hours = c.hours ? ` (${c.hours}h)` : '';
      const provider = c.provider ? ` [${c.provider}]` : '';
      parts.push(`- ${c.title}${provider} — ${c.status ?? 'unknown'}${hours}`);
    }
    parts.push('');
  }

  if (learning.total_training_hours) {
    parts.push(`Total training hours: ${learning.total_training_hours}`);
  }

  return parts.join('\n');
}

function assemblePeopleNetwork(ctx) {
  const parts = [];
  parts.push('PEOPLE NETWORK');
  parts.push('');

  const people = ctx.people;
  if (!people || !people.length) {
    parts.push('(No contacts — add your stakeholder network in the People tab)');
    return parts.join('\n');
  }

  // Group by influence tier
  const byTier = {};
  for (const p of people) {
    const tier = p.influence_tier ?? 'unset';
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(p);
  }

  const tierOrder = ['critical', 'high', 'medium', 'low', 'unset'];
  for (const tier of tierOrder) {
    const group = byTier[tier];
    if (!group || !group.length) continue;
    parts.push(`${tier.charAt(0).toUpperCase() + tier.slice(1)} influence (${group.length}):`);
    for (const p of group.slice(0, 10)) {
      const title = p.title ? ` — ${p.title}` : '';
      const org = p.org ? ` at ${p.org}` : '';
      const type = p.relationship_type ? ` [${p.relationship_type}]` : '';
      parts.push(`  - ${p.name}${title}${org}${type}`);
    }
    if (group.length > 10) parts.push(`  ... and ${group.length - 10} more`);
    parts.push('');
  }

  // Stats
  const st = ctx._stats;
  if (st) {
    if (st.people_by_type) {
      const types = Object.entries(st.people_by_type).map(([t, c]) => `${t}: ${c}`);
      if (types.length) parts.push(`By type: ${types.join(', ')}`);
    }
    if (st.stakeholder_groups && st.stakeholder_groups.length) {
      parts.push(`Stakeholder groups: ${st.stakeholder_groups.join(', ')}`);
    }
  }

  return parts.join('\n');
}

function assembleTheAsk(ctx) {
  const parts = [];
  parts.push('THE ASK');
  parts.push('');

  // Try plan_2027 first
  if (ctx.plan_2027) {
    const plan = ctx.plan_2027;

    if (plan.first_90_days && plan.first_90_days.length) {
      parts.push('First 90 days:');
      for (const item of plan.first_90_days) {
        parts.push(`- ${item.action}: ${item.rationale}`);
      }
      parts.push('');
    }

    if (plan.commercial_focus && plan.commercial_focus.length) {
      parts.push('Commercial focus:');
      for (const item of plan.commercial_focus) {
        parts.push(`- ${item.focus}: ${item.rationale}`);
      }
      parts.push('');
    }

    if (plan.gaps_to_close && plan.gaps_to_close.length) {
      parts.push('Gaps to close:');
      for (const item of plan.gaps_to_close) {
        parts.push(`- ${item.gap}: ${item.approach}`);
      }
      parts.push('');
    }

    if (plan.eminence_and_network && plan.eminence_and_network.length) {
      parts.push('Eminence & network moves:');
      for (const item of plan.eminence_and_network) {
        parts.push(`- ${item.move}: ${item.rationale}`);
      }
    }

    return parts.join('\n');
  }

  // Fall back to parsing polished narrative ask section
  if (ctx.polished_narrative) {
    const narrative = ctx.polished_narrative;
    const askMatch = narrative.match(/The \d{4} Ask[\s\S]*$/i);
    if (askMatch) {
      parts.push(askMatch[0]);
      return parts.join('\n');
    }
  }

  parts.push('(No plan or ask data — generate a Plan in the Narrative tab first)');
  return parts.join('\n');
}

module.exports = { assemblePackage };
