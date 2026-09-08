/**
 * Comprehensive demo seed. Requires reset-demo-data.js to have been run
 * first (so there are exactly 3 doctors and no leftover patients).
 *
 * Distributes at least 20 patients across all 3 doctors, each patient
 * assigned a distinct-flavored condition (made up, not real medical
 * advice) that drives realistic-looking vitals trends and note content.
 * Fills every other table too: lab_results (multi-point time series per
 * patient), imported_records, password_reset_tokens, audit_logs.
 *
 * Patients get NO user accounts — per the current design, patients don't
 * have portal access at all.
 *
 * Usage:
 *   node db/seed-demo-full.js
 */
require('dotenv').config();
const { Client } = require('pg');

const FIRST_NAMES = [
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan',
  'Sophia', 'Lucas', 'Mia', 'James', 'Charlotte', 'Henry',
  'Grace', 'Daniel', 'Aarav', 'Ananya', 'Arjun', 'Kavya',
  'Rohan', 'Meera', 'Aditya', 'Tenzin', 'Moumita', 'Anish'
];

const LAST_NAMES = [
  'Carter', 'Brown', 'Miller', 'Wilson', 'Taylor', 'Anderson',
  'Thomas', 'Moore', 'Martin', 'Jackson', 'White', 'Harris',
  'Clark', 'Walker', 'Sharma', 'Patel', 'Reddy', 'Nair',
  'Iyer', 'Singh', 'Bose', 'Gogoi', 'Lepcha', 'Das'
];
const STREETS = [
  'Godavari Street',
  'Krishna Nagar Road',
  'Amaravati Lane',
  'Rayalaseema Road',
  'Eastern Hills Street',
  'Coastal View Road',
  'Swarna Nagar Lane',
  'Vamsadhara Street',
  'Pennar Avenue',
  'Tungabhadra Road',
  'Kondapalli Street',
  'Mangalagiri Lane',
  'Nandigama Road',
  'Srikrishna Avenue',
  'Janaki Nagar Road',
  'Sankranti Street',
  'Vijaya Nagar Lane',
  'Andhra Heights Road',
  'Godavari View Street',
  'Telugu Nagar Road'
];

const CITIES = [
  'Amarapuram',
  'Krishnapuram',
  'Godavaripuram',
  'Vijayapuram',
  'Suryanagar',
  'Rajapuram',
  'Kalyanapuram',
  'Anandapuram',
  'Vamsinagar',
  'Srinagar',
  'Madhavapuram',
  'Pragathinagar'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDob() {
  const year = 1945 + Math.floor(Math.random() * 65);
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function randomAadhaar() {
  return `${randInt(1000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)}`;
}
function randomMobile() {
  return `${randInt(6, 9)}${randInt(100000000, 999999999)}`;
}
function randomAddress() {
  return `${randInt(100, 999)} ${pick(STREETS)}, ${pick(CITIES)}`;
}

// Each condition drives a realistic vitals bias and a note-content flavor.
// None of this is real medical advice — it's synthetic demo data.
const CONDITIONS = [
  {
    name: 'Hypertension',
    vitals: () => ({ systolic: randInt(140, 165), diastolic: randInt(90, 105), heartRate: randInt(70, 90), temperatureF: 98.2 + Math.random(), glucose: randInt(85, 105) }),
    notes: [
      'Blood pressure remains elevated. Continuing current antihypertensive regimen.',
      'Discussed sodium intake reduction and home BP monitoring.',
      'Follow-up shows slight improvement in readings after medication adjustment.',
    ],
  },
  {
    name: 'Type 2 Diabetes',
    vitals: () => ({ systolic: randInt(115, 135), diastolic: randInt(75, 88), heartRate: randInt(65, 85), temperatureF: 98.0 + Math.random(), glucose: randInt(140, 210) }),
    notes: [
      'Fasting glucose remains above target. Reviewed dietary adherence.',
      'A1C check scheduled. Discussed metformin dosage.',
      'Patient reports improved energy levels since last visit.',
    ],
  },
  {
    name: 'Asthma',
    vitals: () => ({ systolic: randInt(105, 125), diastolic: randInt(65, 80), heartRate: randInt(75, 95), temperatureF: 98.1 + Math.random(), glucose: randInt(80, 100) }),
    notes: [
      'Mild wheezing on exam. Reviewed inhaler technique.',
      'No recent exacerbations reported. Continuing current controller therapy.',
      'Discussed seasonal trigger avoidance strategies.',
    ],
  },
  {
    name: 'Migraine',
    vitals: () => ({ systolic: randInt(100, 120), diastolic: randInt(65, 78), heartRate: randInt(60, 80), temperatureF: 98.0 + Math.random(), glucose: randInt(80, 100) }),
    notes: [
      'Reports 2-3 migraine episodes since last visit, moderate severity.',
      'Discussed trigger diary and preventive therapy options.',
      'Some improvement noted with current regimen.',
    ],
  },
  {
    name: 'Generalized Anxiety',
    vitals: () => ({ systolic: randInt(110, 128), diastolic: randInt(70, 82), heartRate: randInt(78, 98), temperatureF: 98.2 + Math.random(), glucose: randInt(80, 100) }),
    notes: [
      'Patient reports improved sleep with current approach.',
      'Discussed coping strategies and check-in frequency.',
      'Symptoms stable, no acute concerns today.',
    ],
  },
  {
    name: 'Hypothyroidism',
    vitals: () => ({ systolic: randInt(105, 122), diastolic: randInt(68, 80), heartRate: randInt(58, 72), temperatureF: 97.6 + Math.random() * 0.6, glucose: randInt(80, 100) }),
    notes: [
      'TSH levels reviewed, dosage adjustment discussed.',
      'Patient reports low energy, consistent with prior visits.',
      'Follow-up labs ordered to reassess thyroid panel.',
    ],
  },
  {
    name: 'GERD',
    vitals: () => ({ systolic: randInt(108, 126), diastolic: randInt(70, 82), heartRate: randInt(65, 85), temperatureF: 98.1 + Math.random(), glucose: randInt(80, 105) }),
    notes: [
      'Reports occasional heartburn, mostly after large meals.',
      'Discussed dietary triggers and timing of medication.',
      'Symptoms improved since starting current treatment.',
    ],
  },
  {
    name: 'Chronic Lower Back Pain',
    vitals: () => ({ systolic: randInt(112, 130), diastolic: randInt(72, 85), heartRate: randInt(68, 88), temperatureF: 98.1 + Math.random(), glucose: randInt(80, 100) }),
    notes: [
      'Reports intermittent lower back pain, worse with prolonged sitting.',
      'Discussed physical therapy referral and stretching routine.',
      'Some improvement noted with current pain management plan.',
    ],
  },
];

// One in roughly every 6 patients gets a note carrying a stored-XSS demo
// payload, matching the vulnerability already implemented in the notes
// feature (see A05 note in patientController.addNote).
const XSS_DEMO_NOTE = 'Vitals reviewed, stable overall. <img src=x onerror="console.log(\'xss-seed-demo\')"> Continue current plan.';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    const doctorsResult = await client.query('SELECT id, full_name FROM doctors ORDER BY id');
    if (doctorsResult.rows.length === 0) {
      throw new Error('No doctors found. Run db/reset-demo-data.js first.');
    }
    const doctors = doctorsResult.rows;
    console.log(`Distributing patients across ${doctors.length} doctor(s): ${doctors.map((d) => d.full_name).join(', ')}`);

    const TOTAL_PATIENTS = 24; // 24 spreads evenly across 3 doctors = 8 each
    const summary = { patients: 0, notes: 0, labs: 0 };

    for (let i = 0; i < TOTAL_PATIENTS; i++) {
      const doctor = doctors[i % doctors.length];
      const condition = pick(CONDITIONS);
      const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

      const patientResult = await client.query(
        `INSERT INTO patients (full_name, dob, aadhar, phone, address, assigned_doctor_id, gender, patient_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          fullName,
          randomDob(),
          randomAadhaar(),
          randomMobile(),
          randomAddress(),
          doctor.id,
          pick(['Male', 'Female']),
          pick(['new', 'in-progress', 'closed', 'reopened']),
        ]
      );
      const patientId = patientResult.rows[0].id;
      summary.patients += 1;

      // 4-6 time-series lab results, spaced ~30 days apart, biased by condition
      const labCount = randInt(4, 6);
      for (let l = 0; l < labCount; l++) {
        const daysAgo = (labCount - l) * 30 + randInt(-3, 3);
        const vitals = condition.vitals();
        await client.query(
          `INSERT INTO lab_results (patient_id, external_lab_url, result_data, fetched_at)
           VALUES ($1, $2, $3, NOW() - ($4 || ' days')::interval)`,
          [
            patientId,
            `https://labs.example-diagnostics.test/results/${patientId}/${l}`,
            JSON.stringify({ condition: condition.name, ...vitals }),
            daysAgo,
          ]
        );
        summary.labs += 1;
      }

      // 2-4 notes referencing the condition, spaced across recent visits
      const noteCount = randInt(2, 4);
      for (let n = 0; n < noteCount; n++) {
        const daysAgo = (noteCount - n) * 25 + randInt(-3, 3);
        const content = Math.random() < 0.15 ? XSS_DEMO_NOTE : pick(condition.notes);
        await client.query(
          `INSERT INTO medical_notes (patient_id, doctor_id, content, created_at)
           VALUES ($1, $2, $3, NOW() - ($4 || ' days')::interval)`,
          [patientId, doctor.id, `[${condition.name}] ${content}`, daysAgo]
        );
        summary.notes += 1;
      }
    }

    // One imported_records row, attributed to the admin
    const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminResult.rows.length > 0) {
      await client.query('INSERT INTO imported_records (imported_by, raw_payload) VALUES ($1, $2)', [
        adminResult.rows[0].id,
        JSON.stringify({ source: 'legacy-emr-export', recordCount: summary.patients }),
      ]);
    }

    // One expired password_reset_tokens row (doctor account, since patients
    // no longer have accounts to reset)
    const doctorUser = await client.query("SELECT id FROM users WHERE role = 'doctor' LIMIT 1");
    if (doctorUser.rows.length > 0) {
      await client.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, 'seed-demo-expired-token', NOW() - INTERVAL '1 day')`,
        [doctorUser.rows[0].id]
      );
    }

    // Historical audit_logs rows across all users, for the Admin > Audit
    // Logs page to have something to show. Seeded history only - this does
    // NOT mean the app logs live actions; that gap (A09) is unchanged.
    const allUsers = await client.query('SELECT id, role FROM users');
    const somePatients = await client.query('SELECT id FROM patients ORDER BY random() LIMIT 10');
    let logsSeeded = 0;
    for (const u of allUsers.rows) {
      const action = u.role === 'admin' ? 'login' : pick(['login', 'view_patient_record', 'add_note']);
      const targetPatient = somePatients.rows.length > 0 ? pick(somePatients.rows).id : null;
      await client.query(
        `INSERT INTO audit_logs (user_id, action, target_patient_id, success, timestamp)
         VALUES ($1, $2, $3, true, NOW() - ($4 || ' hours')::interval)`,
        [u.id, action, u.role === 'admin' ? null : targetPatient, randInt(1, 240)]
      );
      logsSeeded += 1;
    }

    console.log('\nDone:', { ...summary, imported_records: adminResult.rows.length, password_reset_tokens: doctorUser.rows.length, audit_logs: logsSeeded });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed script failed:', err.message);
  process.exit(1);
});
