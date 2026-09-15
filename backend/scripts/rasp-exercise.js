/**
 * Exercises a RASP-protected backend and ASSERTS correct behavior:
 *   - Legitimate traffic must NOT be blocked (false-positive check)
 *   - Real attacks MUST be blocked with 403
 *   - Compensating audit_logs writes must actually exist for each block
 *
 * This is a stricter gate than iast-exercise.js: that script just fires
 * requests and checks a findings log exists. This one fails loudly if
 * RASP either under-blocks (an attack got through) or over-blocks (a
 * legitimate request got rejected) - either is a real regression.
 */
const { Client } = require('pg');

const BASE = process.env.API_BASE || 'http://localhost:4000/api';
let failures = 0;

function check(label, condition, extra) {
  if (condition) {
    console.log(`PASS - ${label}`);
  } else {
    console.error(`FAIL - ${label}${extra ? ` (${extra})` : ''}`);
    failures += 1;
  }
}

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data.token;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function main() {
  console.log('Logging in as admin and a doctor...');
  const adminToken = await login('admin@clinic.test');
  const doctorToken = await login('dr.reyes@clinic.test');

  console.log('Discovering a real patient assigned to this doctor...');
  const myPatientsRes = await fetch(`${BASE}/doctors/me/patients`, { headers: authHeaders(doctorToken) });
  const myPatientsData = await myPatientsRes.json();
  const patients = myPatientsData.patients || [];
  if (patients.length === 0) throw new Error('Doctor has no assigned patients - has seed data been applied?');
  const patientId = patients[0].id;
  console.log(`Using patient id ${patientId}.\n`);

  // --- Legitimate traffic must pass ---
  const legitSearch = await fetch(`${BASE}/patients/search?q=John`, { headers: authHeaders(doctorToken) });
  check('Legitimate search is NOT blocked', legitSearch.status !== 403, `got ${legitSearch.status}`);

  const legitFetch = await fetch(`${BASE}/patients/${patientId}/lab-results/fetch`, {
    method: 'POST',
    headers: authHeaders(doctorToken),
    body: JSON.stringify({ url: 'https://example.com' }),
  });
  check('Legitimate external lab fetch is NOT blocked', legitFetch.status !== 403, `got ${legitFetch.status}`);

  // --- Real attacks must be blocked ---
  const sqli = await fetch(`${BASE}/patients/search?q=' OR '1'='1`, { headers: authHeaders(doctorToken) });
  check('SQL injection IS blocked (403)', sqli.status === 403, `got ${sqli.status}`);

  const ssrfLocalhost = await fetch(`${BASE}/patients/${patientId}/lab-results/fetch`, {
    method: 'POST',
    headers: authHeaders(doctorToken),
    body: JSON.stringify({ url: 'http://localhost:4000/api/health' }),
  });
  check('SSRF to localhost IS blocked (403)', ssrfLocalhost.status === 403, `got ${ssrfLocalhost.status}`);

  const ssrfMetadata = await fetch(`${BASE}/patients/${patientId}/lab-results/fetch`, {
    method: 'POST',
    headers: authHeaders(doctorToken),
    body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' }),
  });
  check('SSRF to cloud metadata address IS blocked (403)', ssrfMetadata.status === 403, `got ${ssrfMetadata.status}`);

  const codeInjection = await fetch(`${BASE}/admin/import`, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      patients: [{ full_name: 'Test Patient' }],
      transform: 'return { pwned: true };',
    }),
  });
  check('Code injection via transform IS blocked (403)', codeInjection.status === 403, `got ${codeInjection.status}`);

  // --- Compensating audit log writes must actually exist ---
  console.log('\nChecking for compensating audit_logs writes...');
  const dbClient = new Client({ connectionString: process.env.DATABASE_URL });
  await dbClient.connect();
  try {
    const result = await dbClient.query(
      "SELECT action FROM audit_logs WHERE action LIKE 'blocked_%' AND timestamp > NOW() - INTERVAL '2 minutes'"
    );
    check(
      'At least 3 compensating audit_logs rows written for this run\'s blocks',
      result.rows.length >= 3,
      `found ${result.rows.length}`
    );
  } finally {
    await dbClient.end();
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Script error:', err.message);
  process.exit(1);
});
