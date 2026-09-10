/**
 * Usage:
 *   node db/reset-demo-data.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    console.log('Wiping demo/seeded data (doctors are not touched)...');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM medical_notes');
    await client.query('DELETE FROM lab_results');
    await client.query('DELETE FROM imported_records');
    await client.query('DELETE FROM password_reset_tokens');
    await client.query('DELETE FROM patients');

    console.log('Removing any leftover patient accounts (patients do not get portal access)...');
    const removedPatients = await client.query("DELETE FROM users WHERE role = 'patient' RETURNING email");
    console.log(`  Removed ${removedPatients.rows.length} patient account(s).`);

    const finalDoctors = await client.query(
      `SELECT d.full_name, d.specialization, u.email
       FROM doctors d JOIN users u ON u.id = d.user_id
       ORDER BY d.id`
    );
    console.log('\nDone. Doctors currently in the database (untouched by this script):');
    finalDoctors.rows.forEach((d) => console.log(`  - ${d.full_name} (${d.specialization}) — ${d.email}`));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Reset script failed:', err.message);
  process.exit(1);
});
