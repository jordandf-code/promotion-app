// scripts/audit-gate.mjs
//
// Production-dependency audit gate for CI.
//
// Runs `npm audit --omit=dev --audit-level=high --json` in the given workspace
// (backend | frontend) and fails ONLY on high/critical advisories affecting a
// package that is NOT in the reviewed ALLOWLIST below.
//
// Why --omit=dev: dev/build tooling (jest, supertest, eslint, vite, vitest) never
// ships to users, so a CVE in that tree is not a production risk. We audit what
// actually deploys. The weekly-security workflow still scans the full tree for
// awareness.
//
// Allowlist entries are documented, time-stamped exceptions — each must say WHY
// the advisory does not apply to how this app uses the package. Keep this list
// short and revisit it.
//
// Usage: node scripts/audit-gate.mjs <backend|frontend>

import { execSync } from 'node:child_process';

const ALLOWLIST = {
  // react-router (and its re-export shim react-router-dom) high-severity advisories
  // are all SSR / React-Server-Components / framework-mode issues: hydration RCE,
  // RSC XSS/CSRF, __manifest DoS, SSR error-handler injection. This app is a
  // client-side Vite SPA using ONLY the declarative API (BrowserRouter/Routes/
  // Route/Link/hooks) — none of those code paths execute here. The real fix is a
  // react-router v8 major migration, tracked as its own planned task.
  // Reviewed: 2026-07-25 (JDF).
  'react-router': 'SSR/RSC-only CVEs; N/A to client-side SPA. See scripts/audit-gate.mjs. Revisit with planned v8 migration.',
  'react-router-dom': 'Re-export shim depending on react-router; see react-router entry.',
};

const dir = process.argv[2];
if (dir !== 'backend' && dir !== 'frontend') {
  console.error('usage: node scripts/audit-gate.mjs <backend|frontend>');
  process.exit(2);
}

let raw;
try {
  // npm audit exits non-zero when vulnerabilities are found; the JSON report is
  // still written to stdout, so capture it from the thrown error too.
  raw = execSync('npm audit --omit=dev --audit-level=high --json', { cwd: dir, encoding: 'utf8' });
} catch (err) {
  raw = err.stdout || '';
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error(`[${dir}] could not parse npm audit JSON output`);
  process.exit(2);
}

const vulns = report.vulnerabilities || {};
const offenders = [];
const excepted = [];

for (const [name, v] of Object.entries(vulns)) {
  if (v.severity !== 'high' && v.severity !== 'critical') continue;
  if (ALLOWLIST[name]) excepted.push(`${v.severity} ${name}`);
  else offenders.push(`${v.severity} ${name}`);
}

if (excepted.length) {
  console.log(`[${dir}] allowlisted high/critical (documented exceptions): ${excepted.join(', ')}`);
}

if (offenders.length) {
  console.error(`[${dir}] FAIL — un-allowlisted high/critical vulnerabilities in production deps:`);
  for (const o of offenders) console.error(`  - ${o}`);
  console.error(`Fix them, or add a documented exception to scripts/audit-gate.mjs if truly N/A.`);
  process.exit(1);
}

console.log(`[${dir}] OK — no un-allowlisted high/critical vulnerabilities in production deps.`);
