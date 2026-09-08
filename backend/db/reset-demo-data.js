/**
 * Resets demo data to a clean slate:
 *   - Wipes medical_notes, lab_results, imported_records,
 *     password_reset_tokens, audit_logs, and all patients
 *   - Removes any user accounts with role = 'patient' (patients no longer
 *     get portal access at all)
 *   - Keeps the admin account and any existing doctors
 *   - Ensures there are 3 doctors total, each with a distinct
 *     specialization (adds whichever are missing)
 *
 * Safe to run more than once — doctor creation is upsert-style and won't
 * duplicate an existing doctor's email.
 *
 * Usage:
 *   node db/reset-demo-data.js
 */
require('dotenv').config();
const { Client } = require('pg');
const { hashPassword } = require('../src/utils/password');

const TARGET_DOCTORS = [
  { name: 'Dr. Maria Reyes', specialization: 'Internal Medicine', email: 'dr.reyes@clinic.test' },
  { name: 'Dr. Amara Okafor', specialization: 'Pediatrics', email: 'dr.okafor@clinic.test' },
  { name: 'Dr. Julian Voss', specialization: 'Cardiology', email: 'dr.voss@clinic.test' },
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    console.log('Wiping demo/seeded data...');
    await client.query('DELETE FROM audit_logs');
    await client.query('DELETE FROM medical_notes');
    await client.query('DELETE FROM lab_results');
    await client.query('DELETE FROM imported_records');
    await client.query('DELETE FROM password_reset_tokens');
    await client.query('DELETE FROM patients');

    console.log("Removing patient accounts (patients no longer get portal access)...");
    const removedPatients = await client.query("DELETE FROM users WHERE role = 'patient' RETURNING email");
    console.log(`  Removed ${removedPatients.rows.length} patient account(s).`);

    console.log('Ensuring 3 doctors exist with distinct specializations...');
    for (const doc of TARGET_DOCTORS) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [doc.email]);
      let userId;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        console.log(`  ${doc.email} already exists — reusing.`);
      } else {
        const passwordHash = hashPassword('Password123!');
        const inserted = await client.query(
          "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'doctor') RETURNING id",
          [doc.email, passwordHash]
        );
        userId = inserted.rows[0].id;
        console.log(`  Created user ${doc.email}.`);
      }

      const doctorRow = await client.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
      if (doctorRow.rows.length === 0) {
        await client.query(
          'INSERT INTO doctors (user_id, full_name, specialization, license_number) VALUES ($1, $2, $3, $4)',
          [userId, doc.name, doc.specialization, `LIC-${Math.floor(Math.random() * 90000 + 10000)}`]
        );
        console.log(`  Created doctor profile for ${doc.name} (${doc.specialization}).`);
      } else {
        // Keep specialization in sync in case it was missing/different before.
        await client.query('UPDATE doctors SET specialization = $1 WHERE id = $2', [
          doc.specialization,
          doctorRow.rows[0].id,
        ]);
        console.log(`  Doctor profile for ${doc.name} already existed — specialization set to ${doc.specialization}.`);
      }
    }

    const finalDoctors = await client.query('SELECT full_name, specialization FROM doctors ORDER BY id');
    console.log('\nDone. Current doctors:');
    finalDoctors.rows.forEach((d) => console.log(`  - ${d.full_name} (${d.specialization})`));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Reset script failed:', err.message);
  process.exit(1);
});
