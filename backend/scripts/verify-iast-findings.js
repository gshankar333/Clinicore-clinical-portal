/**
 * fails if any expected IAST finding did NOT fire.
 * This app is intentionally vulnerable, so "red" here means something
 * different than for SAST/DAST - it means the instrumentation itself
 * broke, OR a vulnerability got accidentally fixed without anyone
 * updating this list, either of which is worth knowing about loudly.
 */
const fs = require('fs');
const path = require('path');

const EXPECTED_RULES = [
  'sql-injection-tainted-query',
  'ssrf-tainted-fetch',
  'code-injection-new-function',
  'stack-trace-in-response',
  'weak-hash-algorithm-used',
  'weak-jwt-secret-at-runtime',
  'missing-audit-log',
  'idor-cross-doctor-patient-access',
  'fail-open-auth-bypass',
];

const logPath = process.env.IAST_LOG_PATH || path.join(process.cwd(), 'iast-findings.jsonl');

if (!fs.existsSync(logPath)) {
  console.error(`No findings file at ${logPath} - was IAST_MODE=on set when the backend started?`);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);
const findings = lines.map((l) => JSON.parse(l));
const foundRules = new Set(findings.map((f) => f.rule));

console.log(`Total findings: ${findings.length}`);
console.log(`Rules that fired: ${[...foundRules].sort().join(', ')}`);

const missing = EXPECTED_RULES.filter((r) => !foundRules.has(r));

if (missing.length > 0) {
  console.error(`\nMISSING expected findings: ${missing.join(', ')}`);
  console.error('Either the exercise script did not trigger these paths, the instrumentation broke, or the vulnerability was fixed - investigate before assuming this is fine.');
  process.exit(1);
}

console.log('\nAll expected IAST findings fired correctly.');
