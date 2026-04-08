// ai/renderDeck.js
// Takes AI JSON + .pptx template → populated .pptx buffer.
// Uses JSZip to manipulate the pptx (ZIP of XML) entirely in memory.

const fs   = require('fs');
const path = require('path');
const JSZip = require('jszip');

const DEFAULT_TEMPLATE_PATH = path.join(__dirname, '..', 'assets', 'PromotionCaseTemplate.pptx');

// ── XML escaping ────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Run-merging preprocessor ────────────────────────────────────────────────
// PowerPoint XML can split a single visible string across multiple <a:r> runs.
// This merges adjacent runs within each <a:p> that share identical <a:rPr>
// formatting, so placeholder strings become contiguous for replacement.

function mergeRuns(xml) {
  // Process each paragraph independently
  return xml.replace(/<a:p\b[^>]*>[\s\S]*?<\/a:p>/g, (paragraph) => {
    // Extract all runs in this paragraph
    const runRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
    const runs = [];
    let match;
    while ((match = runRegex.exec(paragraph)) !== null) {
      const runContent = match[1];
      // Extract rPr (run properties) and text
      const rPrMatch = runContent.match(/<a:rPr\b[^/]*?\/>/s) || runContent.match(/<a:rPr\b[^>]*?>[\s\S]*?<\/a:rPr>/s);
      const textMatch = runContent.match(/<a:t>([\s\S]*?)<\/a:t>/);
      runs.push({
        full: match[0],
        rPr: rPrMatch ? rPrMatch[0] : '',
        text: textMatch ? textMatch[1] : '',
        hasText: !!textMatch,
      });
    }

    if (runs.length < 2) return paragraph;

    // Merge adjacent runs with identical rPr
    const merged = [runs[0]];
    for (let i = 1; i < runs.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = runs[i];
      if (curr.hasText && prev.hasText && curr.rPr === prev.rPr) {
        prev.text += curr.text;
        prev.merged = true;
      } else {
        merged.push(curr);
      }
    }

    // If nothing was merged, return as-is
    if (merged.length === runs.length) return paragraph;

    // Rebuild the paragraph with merged runs
    let result = paragraph;
    // Remove all original runs
    for (const run of runs) {
      result = result.replace(run.full, () => '\x00PLACEHOLDER\x00');
    }
    // Replace first placeholder with merged runs, remove the rest
    let first = true;
    const mergedXml = merged.map(r => {
      if (!r.hasText) return r.full;
      return `<a:r>${r.rPr}<a:t>${r.text}</a:t></a:r>`;
    }).join('');

    result = result.replace('\x00PLACEHOLDER\x00', () => mergedXml);
    result = result.replace(/\x00PLACEHOLDER\x00/g, '');
    return result;
  });
}

// ── Sequential replacement helper ───────────────────────────────────────────
// Replaces the first occurrence of `placeholder` for each value in `values`.

function replaceNth(xml, placeholder, values) {
  let result = xml;
  for (const val of values) {
    result = result.replace(placeholder, escapeXml(val));
  }
  return result;
}

// ── AI JSON validation + gap-filling ────────────────────────────────────────

const FALLBACK = '[Data not available]';

function validateAndFill(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('AI returned invalid data — not an object');
  }

  const d = { ...data };

  // Simple string fields
  const stringFields = [
    'candidate_name', 'current_role', 'target_role', 'practice', 'qualifying_year',
    'signings_value', 'signings_target', 'revenue_value', 'revenue_target',
    'gp_value', 'gp_target', 'utilization_value', 'utilization_target',
    'win1', 'win2', 'win3', 'win4',
    'opportunity_a_name', 'opportunity_a_stage', 'opportunity_a_value',
    'opportunity_b_name', 'opportunity_b_stage', 'opportunity_b_value',
    'opportunity_c_name', 'opportunity_c_stage', 'opportunity_c_value',
    'ask_1', 'ask_2', 'ask_3',
  ];
  for (const key of stringFields) {
    if (!d[key] || typeof d[key] !== 'string') d[key] = FALLBACK;
  }

  // Criteria array — pad to 6 if short
  if (!Array.isArray(d.criteria)) d.criteria = [];
  while (d.criteria.length < 6) {
    d.criteria.push({ label: FALLBACK, stars: '★★★☆☆', assessment: FALLBACK });
  }
  d.criteria = d.criteria.slice(0, 6);
  for (const c of d.criteria) {
    if (!c.label || typeof c.label !== 'string') c.label = FALLBACK;
    if (!c.stars || typeof c.stars !== 'string' || c.stars.length !== 5) c.stars = '★★★☆☆';
    if (!c.assessment || typeof c.assessment !== 'string') c.assessment = FALLBACK;
  }

  return d;
}

// ── Main render function ────────────────────────────────────────────────────

async function renderDeck(aiData, templateBase64) {
  const data = validateAndFill(aiData);

  // Load template
  let buffer;
  if (templateBase64) {
    buffer = Buffer.from(templateBase64, 'base64');
  } else {
    buffer = fs.readFileSync(DEFAULT_TEMPLATE_PATH);
  }

  const zip = await JSZip.loadAsync(buffer);

  // Find slide files (handle both slide1.xml and slide1.xml patterns)
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort();

  if (slideFiles.length < 2) {
    throw new Error('Template must contain at least 2 slides');
  }

  // Read and merge runs in both slides
  let slide1 = mergeRuns(await zip.file(slideFiles[0]).async('string'));
  let slide2 = mergeRuns(await zip.file(slideFiles[1]).async('string'));

  // ── Slide 1: Unambiguous bracket placeholders ──────────────────────────

  const slide1Brackets = [
    ['[Candidate Name]',                     data.candidate_name],
    ['[Associate Partner – Band 10]',        data.current_role],
    ['[Client Partner – Band D]',            data.target_role],
    ['[Public Sector / Canadian Federal]',   data.practice],
    ['[2025]',                               data.qualifying_year],
  ];
  for (const [ph, val] of slide1Brackets) {
    slide1 = slide1.replace(ph, escapeXml(val));
  }

  // Win placeholders — match by prefix to handle varying full text
  const winPlaceholders = [
    ['[Win 1', data.win1],
    ['[Win 2', data.win2],
    ['[Win 3', data.win3],
    ['[Win 4', data.win4],
  ];
  for (const [prefix, val] of winPlaceholders) {
    // Match from prefix to closing bracket
    const regex = new RegExp(escapeRegex(prefix) + '[^\\]]*\\]');
    slide1 = slide1.replace(regex, escapeXml(val));
  }

  // Opportunity name placeholders
  const opportunityPlaceholders = [
    ['[Pursuit A', data.opportunity_a_name],
    ['[Pursuit B', data.opportunity_b_name],
    ['[Pursuit C', data.opportunity_c_name],
  ];
  for (const [prefix, val] of opportunityPlaceholders) {
    const regex = new RegExp(escapeRegex(prefix) + '[^\\]]*\\]');
    slide1 = slide1.replace(regex, escapeXml(val));
  }

  // Opportunity stage placeholders — 3 sequential
  slide1 = replaceNth(slide1, '[e.g., Proposal Submitted]', [
    data.opportunity_a_stage, data.opportunity_b_stage, data.opportunity_c_stage,
  ]);

  // ── Slide 1: Positionally-ambiguous metric placeholders ────────────────
  // CRITICAL: replace longer patterns BEFORE shorter ones

  slide1 = replaceNth(slide1, 'vs $XXM target', [data.signings_target, data.revenue_target]);
  slide1 = replaceNth(slide1, 'vs XX% target', [data.gp_target, data.utilization_target]);
  slide1 = replaceNth(slide1, '$XXM', [
    data.signings_value, data.revenue_value,
    data.opportunity_a_value, data.opportunity_b_value, data.opportunity_c_value,
  ]);
  slide1 = replaceNth(slide1, 'XX%', [data.gp_value, data.utilization_value]);

  // ── Slide 2: Criteria table ────────────────────────────────────────────

  // Criteria labels — 6 sequential
  slide2 = replaceNth(slide2, '[e.g., Client Relationship &amp; Trust]', data.criteria.map(c => c.label));
  // Also try unescaped version in case template uses raw &
  slide2 = replaceNth(slide2, '[e.g., Client Relationship & Trust]', data.criteria.map(c => c.label));

  // Star ratings — match any 5-char sequence of ★ and ☆
  const starRegex = /[★☆]{5}/;
  for (const c of data.criteria) {
    slide2 = slide2.replace(starRegex, c.stars);
  }

  // Assessment placeholders
  const assessmentPrefixes = ['[Jordan is the trusted advisor'];
  // Try matching full placeholder pattern first, then fall back to sequential
  const assessmentRegex = /\[Jordan is[^\]]*\]/;
  for (const c of data.criteria) {
    slide2 = slide2.replace(assessmentRegex, escapeXml(c.assessment));
  }

  // The Ask bullets
  const askPlaceholders = [
    ['[Bullet 1', data.ask_1],
    ['[Bullet 2', data.ask_2],
    ['[Bullet 3', data.ask_3],
  ];
  for (const [prefix, val] of askPlaceholders) {
    const regex = new RegExp(escapeRegex(prefix) + '[^\\]]*\\]');
    slide2 = slide2.replace(regex, escapeXml(val));
  }

  // Write modified slides back
  zip.file(slideFiles[0], slide1);
  zip.file(slideFiles[1], slide2);

  return zip.generateAsync({ type: 'nodebuffer' });
}

// ── Regex escape helper ─────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { renderDeck };
