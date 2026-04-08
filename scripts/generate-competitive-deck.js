#!/usr/bin/env node
// Generate competitive analysis PowerPoint deck
const pptxgen = require('pptxgenjs');
const path = require('path');

const pres = new pptxgen();

// Brand colors
const NAVY = '1B2A4A';
const BLUE = '2D5AA0';
const LIGHT_BLUE = 'E8F0FE';
const ACCENT = '4CAF50';
const RED = 'E53935';
const ORANGE = 'FF9800';
const GRAY = '6B7280';
const LIGHT_GRAY = 'F3F4F6';
const WHITE = 'FFFFFF';
const DARK = '1F2937';

pres.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
pres.layout = 'WIDE';

// ── Slide 1: Title ─────────────────────────────────────────────────────────

let slide = pres.addSlide();
slide.background = { color: NAVY };

slide.addText('Competitive Analysis', {
  x: 0.8, y: 1.5, w: 11.7, h: 1.2,
  fontSize: 44, fontFace: 'Arial', color: WHITE, bold: true,
});
slide.addText('Career Command Center', {
  x: 0.8, y: 2.7, w: 11.7, h: 0.9,
  fontSize: 32, fontFace: 'Arial', color: '90CAF9',
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 3.8, w: 2.5, h: 0.06, fill: { color: ACCENT },
});
slide.addText('Promotion Tracker for Professional Services', {
  x: 0.8, y: 4.1, w: 11.7, h: 0.6,
  fontSize: 18, fontFace: 'Arial', color: '90CAF9',
});
slide.addText('April 2026', {
  x: 0.8, y: 5.5, w: 11.7, h: 0.5,
  fontSize: 14, fontFace: 'Arial', color: GRAY,
});

// ── Slide 2: The Opportunity ────────────────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: WHITE };

slide.addText('The Opportunity', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 32, fontFace: 'Arial', color: NAVY, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

const stats = [
  { num: '$6.3B', label: 'AI career tools\nmarket by 2027', color: BLUE },
  { num: '$0', label: 'Spent on internal\npromotion tracking', color: RED },
  { num: '13-17yr', label: 'Path to Partner\nat Big 4 firms', color: ORANGE },
  { num: '$250K-$5M+', label: 'Partner compensation\n(high stakes)', color: ACCENT },
];

stats.forEach((s, i) => {
  const x = 0.8 + i * 3.1;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y: 1.8, w: 2.8, h: 2.4,
    fill: { color: LIGHT_GRAY }, rectRadius: 0.15,
  });
  slide.addText(s.num, {
    x, y: 2.0, w: 2.8, h: 0.9,
    fontSize: 28, fontFace: 'Arial', color: s.color, bold: true, align: 'center',
  });
  slide.addText(s.label, {
    x, y: 2.9, w: 2.8, h: 0.9,
    fontSize: 13, fontFace: 'Arial', color: GRAY, align: 'center',
  });
});

slide.addText(
  'No tool exists that combines promotion criteria tracking, quantitative scorecards, relationship CRM,\nopportunity pipeline, AI gap analysis, and narrative generation for professionals pursuing Partner.',
  {
    x: 0.8, y: 4.7, w: 11.7, h: 0.9,
    fontSize: 15, fontFace: 'Arial', color: DARK, align: 'center',
    italic: true,
  }
);

slide.addText('The current "competition" is spreadsheets and $300-500/hr executive coaches.', {
  x: 0.8, y: 5.7, w: 11.7, h: 0.5,
  fontSize: 14, fontFace: 'Arial', color: RED, align: 'center', bold: true,
});

// ── Slide 3: Market Landscape ───────────────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: WHITE };

slide.addText('Market Landscape: 5 Categories, 0 Fit', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 28, fontFace: 'Arial', color: NAVY, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

const categories = [
  {
    name: 'Job Search Tools',
    examples: 'Teal, Careerflow, Huntr, AIApply',
    what: 'Resume builders, application trackers, interview prep',
    gap: 'Help you LEAVE — zero features for internal advancement',
    color: BLUE,
  },
  {
    name: 'Brag Doc Tools',
    examples: 'Climb, BragJournal, BragDoc.ai, SuccessSnap',
    what: 'Achievement journals, AI-polished brag documents',
    gap: 'No metrics, no criteria framework, no analysis — just a journal',
    color: ORANGE,
  },
  {
    name: 'AI Career Coaches',
    examples: 'Rocky.ai, Aptitune, Marlee, CoachHub',
    what: 'Conversational coaching, self-assessments, soft skills',
    gap: 'Generic coaching chat — no structured data tracking',
    color: '9C27B0',
  },
  {
    name: 'Enterprise HR Platforms',
    examples: 'Lattice, TalentGuard, Fuel50, 15Five, Betterworks',
    what: 'Career pathing, competency matrices, performance reviews',
    gap: 'Require company adoption — individual cannot sign up',
    color: RED,
  },
  {
    name: 'Promotion Assessments',
    examples: 'Resumly readiness quiz',
    what: 'One-time promotion readiness score',
    gap: 'Single quiz, no ongoing tracking, no data model',
    color: GRAY,
  },
];

categories.forEach((cat, i) => {
  const y = 1.5 + i * 1.1;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y, w: 11.7, h: 0.95, fill: { color: LIGHT_GRAY }, rectRadius: 0.1,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y, w: 0.12, h: 0.95, fill: { color: cat.color }, rectRadius: 0,
  });
  slide.addText(cat.name, {
    x: 1.1, y, w: 2.4, h: 0.95,
    fontSize: 13, fontFace: 'Arial', color: DARK, bold: true, valign: 'middle',
  });
  slide.addText(cat.examples, {
    x: 3.5, y, w: 2.5, h: 0.95,
    fontSize: 11, fontFace: 'Arial', color: GRAY, valign: 'middle',
  });
  slide.addText(cat.gap, {
    x: 6.2, y, w: 6.1, h: 0.95,
    fontSize: 12, fontFace: 'Arial', color: DARK, valign: 'middle',
  });
});

// ── Slide 4: Key Competitors Deep Dive ──────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: WHITE };

slide.addText('Key Competitors: Deep Dive', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 28, fontFace: 'Arial', color: NAVY, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

const competitors = [
  {
    name: 'Teal',
    stats: '2M+ users  |  $20.7M raised  |  ~$35M ARR  |  100K paying @ $29/mo',
    desc: 'Best-in-class job search platform. AI resume builder, ATS scoring, Chrome extension for 40+ job boards. Strong free tier drives acquisition.',
    verdict: 'Validates career tooling demand. But 100% job-search — zero internal advancement features.',
  },
  {
    name: 'Lattice Grow',
    stats: 'Enterprise  |  $15-17/user/mo  |  G2: 4.7/5',
    desc: 'Career tracks with competency matrices. HR defines ladders top-down. Gap visualization via radar charts. Integrates with performance reviews.',
    verdict: 'Closest enterprise analog, but requires company buy-in. Generic competencies, not business metrics.',
  },
  {
    name: 'Rocky.ai',
    stats: 'Individual  |  $9.99/mo  |  25 languages  |  White-label available',
    desc: 'Daily 5-min AI coaching (positive psychology). Goal tracking, habit reminders, roleplay practice. Good engagement loop.',
    verdict: 'Best at habit-building. But conversational only — no structured data, metrics, or scorecards.',
  },
  {
    name: 'Climb',
    stats: 'iOS app  |  Individual  |  Gamified',
    desc: 'Weekly achievement logging with "level up" gamification. Generates performance review reports.',
    verdict: 'Closest individual tool. Covers ~10% of our app (simplified Wins tab). No scorecard or strategy.',
  },
];

competitors.forEach((c, i) => {
  const y = 1.5 + i * 1.4;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y, w: 11.7, h: 1.25, fill: { color: LIGHT_GRAY }, rectRadius: 0.1,
  });
  slide.addText(c.name, {
    x: 1.1, y: y + 0.05, w: 2.0, h: 0.45,
    fontSize: 16, fontFace: 'Arial', color: NAVY, bold: true,
  });
  slide.addText(c.stats, {
    x: 3.1, y: y + 0.05, w: 9.1, h: 0.35,
    fontSize: 10, fontFace: 'Arial', color: GRAY,
  });
  slide.addText(c.desc, {
    x: 1.1, y: y + 0.4, w: 11.1, h: 0.35,
    fontSize: 11, fontFace: 'Arial', color: DARK,
  });
  slide.addText(c.verdict, {
    x: 1.1, y: y + 0.8, w: 11.1, h: 0.35,
    fontSize: 11, fontFace: 'Arial', color: RED, bold: true,
  });
});

// ── Slide 5: Feature Comparison Matrix ──────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: WHITE };

slide.addText('Feature Comparison Matrix', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 28, fontFace: 'Arial', color: NAVY, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

const matrixHeaders = ['Feature', 'Our App', 'Teal', 'Climb', 'Rocky', 'Lattice', 'TalentGuard'];
const matrixRows = [
  ['Individual sign-up',          'YES', 'YES',  'YES',  'YES',  'NO',   'NO'],
  ['Promotion scorecard',         'YES', '—',    '—',    '—',    '—',    '—'],
  ['Business metric tracking',    'YES', '—',    '—',    '—',    '—',    '—'],
  ['Win/achievement logging',     'YES', 'Basic','YES',  '—',    '—',    '—'],
  ['Relationship CRM',            'YES', 'Basic','—',    '—',    '—',    '—'],
  ['Opportunity pipeline',        'YES', '—',    '—',    '—',    '—',    '—'],
  ['AI gap analysis',             'YES', '—',    '—',    '—',    '—',    'Comp.'],
  ['AI narrative generation',     'YES', 'Rsme', '—',    '—',    '—',    '—'],
  ['Readiness score',             'YES', '—',    '—',    '—',    '—',    'Comp.'],
  ['Year-over-year tracking',     'YES', '—',    '—',    '—',    '—',    '—'],
  ['Consulting-specific',         'YES', '—',    '—',    '—',    '—',    '—'],
  ['Goal management',             'YES', 'Basic','—',    'YES',  'YES',  'YES'],
];

const colW = [2.6, 1.3, 1.0, 1.0, 1.0, 1.1, 1.3];
const tableX = 1.2;

// Header row
matrixHeaders.forEach((h, i) => {
  let xPos = tableX;
  for (let j = 0; j < i; j++) xPos += colW[j];
  slide.addText(h, {
    x: xPos, y: 1.4, w: colW[i], h: 0.45,
    fontSize: 10, fontFace: 'Arial', color: WHITE, bold: true,
    fill: { color: NAVY }, align: 'center', valign: 'middle',
    margin: [0, 4, 0, 4],
  });
});

// Data rows
matrixRows.forEach((row, ri) => {
  const y = 1.85 + ri * 0.4;
  const bgColor = ri % 2 === 0 ? LIGHT_GRAY : WHITE;
  row.forEach((cell, ci) => {
    let xPos = tableX;
    for (let j = 0; j < ci; j++) xPos += colW[j];
    let cellColor = DARK;
    let cellBold = false;
    if (cell === 'YES') { cellColor = ACCENT; cellBold = true; }
    else if (cell === 'NO') { cellColor = RED; cellBold = true; }
    else if (cell === '—') { cellColor = 'CCCCCC'; }
    slide.addText(cell, {
      x: xPos, y, w: colW[ci], h: 0.4,
      fontSize: ci === 0 ? 10 : 10,
      fontFace: 'Arial', color: cellColor, bold: ci === 0 || cellBold,
      fill: { color: bgColor },
      align: ci === 0 ? 'left' : 'center',
      valign: 'middle',
      margin: ci === 0 ? [0, 0, 0, 8] : [0, 4, 0, 4],
    });
  });
});

// ── Slide 6: How We Differentiate ───────────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: NAVY };

slide.addText('How We Differentiate', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 28, fontFace: 'Arial', color: WHITE, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

const diffs = [
  {
    title: 'Individual-First',
    desc: 'No HR department needed. You sign up, you own your data, you build your case.',
    vs: 'vs. Enterprise platforms that require company adoption',
  },
  {
    title: 'Hard Metrics, Not Soft Ratings',
    desc: 'Track signings, revenue, utilization, gross profit — real numbers, not 1-5 competency scales.',
    vs: 'vs. Lattice/TalentGuard with generic competency models',
  },
  {
    title: 'AI Grounded in YOUR Data',
    desc: 'Gap analysis and narrative generation built on all 7 data domains — scorecard, wins, goals, people, opportunities, story, learning.',
    vs: 'vs. Generic coaching chatbots with no context',
  },
  {
    title: 'Built for the Partner Track',
    desc: 'Purpose-built for the highest-stakes career transition in professional services: the path to Partner.',
    vs: 'vs. Job search tools that help you leave, not advance',
  },
];

diffs.forEach((d, i) => {
  const x = 0.8 + (i % 2) * 6.1;
  const y = 1.6 + Math.floor(i / 2) * 2.7;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: 5.7, h: 2.3,
    fill: { color: '243B5C' }, rectRadius: 0.15,
  });
  slide.addText(d.title, {
    x: x + 0.3, y: y + 0.2, w: 5.1, h: 0.5,
    fontSize: 18, fontFace: 'Arial', color: ACCENT, bold: true,
  });
  slide.addText(d.desc, {
    x: x + 0.3, y: y + 0.7, w: 5.1, h: 0.7,
    fontSize: 13, fontFace: 'Arial', color: WHITE,
  });
  slide.addText(d.vs, {
    x: x + 0.3, y: y + 1.5, w: 5.1, h: 0.5,
    fontSize: 11, fontFace: 'Arial', color: '90CAF9', italic: true,
  });
});

// ── Slide 7: Where Competitors Are Better (Honest) ─────────────────────────

slide = pres.addSlide();
slide.background = { color: WHITE };

slide.addText('Where Competitors Are Better (Honest Assessment)', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 28, fontFace: 'Arial', color: NAVY, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: RED },
});

const honestItems = [
  {
    who: "Teal's UX & Distribution",
    detail: '2M users, $20.7M funded, 265 employees. Polished Chrome extension creates seamless save-from-any-job-board flow. We don\'t have that level of distribution or polish yet.',
    response: 'Our depth in promotion tracking is the moat — they can\'t easily add our features.',
  },
  {
    who: "Rocky.ai's Habit Loop",
    detail: 'Daily 5-min coaching sessions build a habit. Our app requires the user to come in and enter data proactively.',
    response: 'Phase roadmap includes smart nudges and weekly digest emails to drive engagement.',
  },
  {
    who: 'Enterprise Data Advantage',
    detail: 'Lattice/Betterworks have real performance review data and 360 feedback flowing automatically. We require manual data entry.',
    response: 'Bulk import (Phase 24) and LinkedIn import (Phase 25) reduce friction. 360 feedback (Phase 26) adds external input.',
  },
  {
    who: 'Brag Doc Simplicity',
    detail: 'Sometimes "just write down what you did" is all someone needs. Our app asks for more commitment.',
    response: 'Demo data + onboarding flow lowers barrier. But we serve users who need more than a journal.',
  },
];

honestItems.forEach((item, i) => {
  const y = 1.5 + i * 1.4;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y, w: 11.7, h: 1.25, fill: { color: 'FFF3E0' }, rectRadius: 0.1,
  });
  slide.addText(item.who, {
    x: 1.1, y: y + 0.05, w: 11.1, h: 0.35,
    fontSize: 14, fontFace: 'Arial', color: ORANGE, bold: true,
  });
  slide.addText(item.detail, {
    x: 1.1, y: y + 0.35, w: 11.1, h: 0.4,
    fontSize: 11, fontFace: 'Arial', color: DARK,
  });
  slide.addText('Our response: ' + item.response, {
    x: 1.1, y: y + 0.8, w: 11.1, h: 0.35,
    fontSize: 11, fontFace: 'Arial', color: ACCENT, bold: true,
  });
});

// ── Slide 8: Market Signals ─────────────────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: WHITE };

slide.addText('Market Signals & Validation', {
  x: 0.8, y: 0.4, w: 11.7, h: 0.8,
  fontSize: 28, fontFace: 'Arial', color: NAVY, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.15, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

const signals = [
  { icon: '$', title: 'Teal: ~$35M ARR', desc: '100K subscribers paying $29/mo for job search tools alone. Career tooling has proven willingness-to-pay.' },
  { icon: '$', title: 'Valence: $75M raised', desc: 'Series B (Sept 2025) for enterprise AI coaching. Corporates are spending heavily on career development AI.' },
  { icon: '#', title: '$6.3B market by 2027', desc: 'Grand View Research projection for AI career development. Almost entirely captured by job search and enterprise L&D.' },
  { icon: '!', title: '2026 AI promotion trend', desc: 'Ring, Meta, Accenture now require demonstration of AI usage in promotion cases. AI-assisted career strategy is mainstream.' },
  { icon: '★', title: '"Career Command Center" unclaimed', desc: 'No product, no trademark. The phrase is used generically in blog posts. Brandable and available.' },
  { icon: '→', title: 'Multi-firm expansion path', desc: 'IBM → Deloitte → EY → Accenture → McKinsey. Same framework, different criteria templates. Natural growth vector.' },
];

signals.forEach((s, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = 0.8 + col * 6.1;
  const y = 1.5 + row * 1.8;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: 5.7, h: 1.5, fill: { color: LIGHT_GRAY }, rectRadius: 0.1,
  });
  slide.addText(s.title, {
    x: x + 0.3, y: y + 0.1, w: 5.1, h: 0.45,
    fontSize: 16, fontFace: 'Arial', color: NAVY, bold: true,
  });
  slide.addText(s.desc, {
    x: x + 0.3, y: y + 0.6, w: 5.1, h: 0.7,
    fontSize: 12, fontFace: 'Arial', color: DARK,
  });
});

// ── Slide 9: The Moat ───────────────────────────────────────────────────────

slide = pres.addSlide();
slide.background = { color: NAVY };

slide.addText('The Moat', {
  x: 0.8, y: 0.5, w: 11.7, h: 0.8,
  fontSize: 36, fontFace: 'Arial', color: WHITE, bold: true,
});
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.25, w: 1.8, h: 0.05, fill: { color: ACCENT },
});

slide.addText(
  'Every tool in the market is solving a different problem.',
  {
    x: 1.5, y: 1.8, w: 10.3, h: 0.7,
    fontSize: 22, fontFace: 'Arial', color: '90CAF9', italic: true, align: 'center',
  }
);

const moatItems = [
  { label: 'Job search tools', verb: 'help you leave' },
  { label: 'Enterprise platforms', verb: 'require your company to buy in' },
  { label: 'Brag doc tools', verb: 'are journals without strategy' },
  { label: 'AI coaches', verb: 'are generic conversations' },
];

moatItems.forEach((m, i) => {
  const y = 2.8 + i * 0.65;
  slide.addText(`${m.label}  →  ${m.verb}`, {
    x: 2.5, y, w: 8.3, h: 0.5,
    fontSize: 16, fontFace: 'Arial', color: WHITE,
  });
});

slide.addShape(pres.shapes.RECTANGLE, {
  x: 2.5, y: 5.4, w: 8.3, h: 0.06, fill: { color: ACCENT },
});

slide.addText(
  'We are the only tool that combines promotion criteria + scorecard + CRM +\npipeline + AI gap analysis + narrative generation for individual professionals.',
  {
    x: 1.5, y: 5.6, w: 10.3, h: 0.9,
    fontSize: 16, fontFace: 'Arial', color: ACCENT, bold: true, align: 'center',
  }
);

slide.addText('Our real competition is spreadsheets.\nWe win by being 10x better than a spreadsheet.', {
  x: 1.5, y: 6.3, w: 10.3, h: 0.8,
  fontSize: 14, fontFace: 'Arial', color: '90CAF9', align: 'center',
});

// ── Save ────────────────────────────────────────────────────────────────────

const outPath = path.join(__dirname, '..', 'docs', 'Competitive_Analysis.pptx');
pres.writeFile({ fileName: outPath }).then(() => {
  console.log(`Deck saved to: ${outPath}`);
});
