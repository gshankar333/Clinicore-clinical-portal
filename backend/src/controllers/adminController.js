const pool = require('../config/db');
const _ = require('lodash'); // VULNERABLE (A03): pinned to 4.17.15, known prototype-pollution CVEs (e.g. CVE-2019-10744) in merge()
const { hashPassword } = require('../utils/password');
const { fetchPatientsForDoctor } = require('./doctorController');

async function listUsers(req, res, next) {
  try {
    const result = await pool.query('SELECT id, email, role, created_at FROM users ORDER BY id');
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }
    const passwordHash = hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, passwordHash, role]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    res.json({ auditLogs: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/import  { patients: [...], transform }
 * VULNERABLE (A08 - Software or Data Integrity Failures): the import
 * payload can include an optional `transform` field - a string of JS meant
 * to "map legacy field names" - which the server runs with `new Function`.
 * There is no signature/checksum on the payload and no restriction on what
 * the transform code can do. This is a straight code-injection path
 * dressed up as a data-transform convenience feature, which is exactly how
 * real insecure-deserialization bugs tend to sneak into "import" features.
 */
async function importRecords(req, res, next) {
  try {
    const { patients, transform } = req.body;

    if (!Array.isArray(patients)) {
      return res.status(400).json({ error: 'patients must be an array' });
    }

    let mapFn = (p) => _.merge({ full_name: '', dob: null, ssn: null }, p);
    if (transform) {
      // eslint-disable-next-line no-new-func
      mapFn = new Function('patient', transform);
    }

    const processed = patients.map(mapFn);

    const saved = await pool.query(
      'INSERT INTO imported_records (imported_by, raw_payload) VALUES ($1, $2) RETURNING id, imported_at',
      [req.user.id, JSON.stringify({ patients, transform })]
    );

    // NOTE (A09): no audit_logs write here either, despite this being one
    // of the most sensitive actions in the app.

    res.status(201).json({ importRecord: saved.rows[0], processedCount: processed.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/doctors  list all doctors with a patient count each.
 */
async function listDoctors(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.specialization, d.license_number, u.email,d.gender,d.phone,
              COUNT(p.id)::int AS patient_count
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN patients p ON p.assigned_doctor_id = d.id
       GROUP BY d.id, u.email
       ORDER BY d.full_name`
    );

    res.json({ doctors: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/doctors  { email, password, full_name, specialization, license_number }
 * Creates both the user account and the doctor profile together.
 */
async function createDoctor(req, res, next) {
  try {
    const { email, password, full_name, specialization, license_number, gender, phone } = req.body;
    if (!email || !password || !full_name || !gender || !phone || !specialization) {
      return res.status(400).json({ error: 'email, password, full_name, gender, phone, and specialization are required' });
    }

    const passwordHash = hashPassword(password);
    const userResult = await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'doctor') RETURNING id",
      [email, passwordHash]
    );
    const doctorResult = await pool.query(
      'INSERT INTO doctors (user_id, full_name, specialization, license_number, gender, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userResult.rows[0].id, full_name, specialization || null, license_number || null, gender || null, phone || null]
    );
  
    res.status(201).json({ doctor: doctorResult.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/doctors/:id  doctor profile (for the admin's doctor detail page).
 */
async function getDoctorProfile(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.specialization, d.license_number, u.email, d.gender, d.phone
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({ doctor: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/doctors/:id
 */
async function updateDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, specialization, license_number, gender, phone } = req.body;
    const result = await pool.query(
      `UPDATE doctors SET
         full_name = COALESCE($1, full_name),
         specialization = COALESCE($2, specialization),
         license_number = COALESCE($3, license_number),
         gender = COALESCE($4, gender),
         phone = COALESCE($5, phone)
       WHERE id = $6 RETURNING *`,
      [full_name, specialization, license_number, gender, phone, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({ doctor: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/doctors/:id
 * Refuses to delete a doctor who still has patients assigned, rather than
 * cascading - losing medical records silently on a doctor deletion would
 * be a bad default for a healthcare app. Reassign or remove patients first.
 */
async function deleteDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const patientCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM patients WHERE assigned_doctor_id = $1',
      [id]
    );
    if (patientCount.rows[0].count > 0) {
      return res.status(409).json({
        error: `Cannot delete: this doctor still has ${patientCount.rows[0].count} patient(s) assigned. Reassign or remove them first.`,
      });
    }

    const doctorResult = await pool.query('SELECT user_id FROM doctors WHERE id = $1', [id]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    await pool.query('DELETE FROM doctors WHERE id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [doctorResult.rows[0].user_id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/doctors/:id/patients same shape as a doctor's own
 * "my patients" list, but admin can view it for any doctor.
 */
async function getDoctorPatients(req, res, next) {
  try {
    const { id } = req.params;
    const patients = await fetchPatientsForDoctor(id);
    res.json({ patients });
  } catch (err) {
    next(err);
  }
}

async function assignPatientToDoctor(req, res, next) {
  try {
    const { id: doctorId } = req.params;
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const doctorResult = await pool.query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const patientResult = await pool.query('SELECT id FROM patients WHERE id = $1', [patientId]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const updated = await pool.query(
      'UPDATE patients SET assigned_doctor_id = $1 WHERE id = $2 RETURNING *',
      [doctorId, patientId]
    );

    res.status(200).json({ patient: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  deleteUser,
  getAuditLogs,
  importRecords,
  listDoctors,
  createDoctor,
  getDoctorProfile,
  updateDoctor,
  deleteDoctor,
  getDoctorPatients,
  assignPatientToDoctor,
};
