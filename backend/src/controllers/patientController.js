const pool = require('../config/db');
const { verifyToken } = require('../utils/jwt');

/**
 * GET /api/patients/search?q=...
 * VULNERABLE (A05 - Injection): search term is concatenated directly into
 * the SQL string instead of using a parameterized query. A value like
 *   ' OR '1'='1
 * returns every row; UNION-based payloads can pull data from other tables.
 * Doctor/admin only.
 */
async function searchPatients(req, res, next) {
  try {
    const q = req.query.q || '';
    const sql = `SELECT id, full_name, dob, phone FROM patients WHERE full_name ILIKE '%${q}%'`;
    const result = await pool.query(sql);
    res.json({ patients: result.rows });
  } catch (err) {
    next(err);
  }
}
async function getPatientsByFilter(req, res, next) {
  try{
    const { filter } = req.query;
    let sql = 'SELECT id, full_name, dob, phone, aadhar, address, gender, assigned_doctor_id, patient_status FROM patients';
    const result = await pool.query(sql);
    res.json({ patients: result.rows });
  } catch(err){
    next(err);
  }
}
/**
 * GET /api/patients/:id
 * VULNERABLE (A01 - Broken Access Control / IDOR): any authenticated user
 * (including role "patient") can fetch ANY patient record just by knowing
 * or guessing the numeric ID — there's no check that the requester is the
 * patient themself, or the assigned doctor, or an admin.
 */
async function getPatientById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const notes = await pool.query(
      'SELECT id, doctor_id, content, created_at FROM medical_notes WHERE patient_id = $1 ORDER BY created_at DESC',
      [id]
    );
    const labs = await pool.query(
      'SELECT id, external_lab_url, result_data, fetched_at FROM lab_results WHERE patient_id = $1',
      [id]
    );

    // NOTE (A09): no audit_logs write here — accessing a patient record
    // currently leaves no trail. Intentional for now.

    res.json({ patient: result.rows[0], notes: notes.rows, labResults: labs.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients/:id/notes  { content }
 * VULNERABLE (A05 - Injection / Stored XSS): content is stored verbatim.
 * The frontend (built in a later phase) will render this without escaping,
 * so a note like <script>...</script> executes in whoever's browser views
 * the record — including the patient's own portal view.
 */
async function addNote(req, res, next) {
  try {
    const { id } = req.params; // patient id
    const { content } = req.body;
    const doctorId = req.user.doctorId; // attached by requireDoctorProfile middleware

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const result = await pool.query(
      'INSERT INTO medical_notes (patient_id, doctor_id, content) VALUES ($1, $2, $3) RETURNING *',
      [id, doctorId, content]
    );

    res.status(201).json({ note: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients/:id/lab-results/fetch  { url }
 * VULNERABLE (A01 - SSRF, filed under Broken Access Control in 2025):
 * the server fetches whatever URL the client supplies with no allow-list,
 * no check against private/internal IP ranges, and no restriction on
 * scheme. An attacker can point this at internal services
 * (e.g. http://localhost:4000/api/... or cloud metadata endpoints).
 */
async function fetchLabResult(req, res, next) {
  try {
    const { id } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const response = await fetch(url);
    const resultData = await response.text();

    const saved = await pool.query(
      'INSERT INTO lab_results (patient_id, external_lab_url, result_data, fetched_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [id, url, JSON.stringify({ raw: resultData.slice(0, 2000) })]
    );

    res.status(201).json({ labResult: saved.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/me
 * Resolves the calling patient's own record via their user_id.
 * (This is the "correct" pattern — contrast with GET /api/patients/:id,
 * which has no such check.)
 */
async function getMyRecord(req, res, next) {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No patient record linked to this account' });
    }
    const patient = result.rows[0];

    const notes = await pool.query(
      'SELECT id, doctor_id, content, created_at FROM medical_notes WHERE patient_id = $1 ORDER BY created_at DESC',
      [patient.id]
    );
    const labs = await pool.query(
      'SELECT id, external_lab_url, result_data, fetched_at FROM lab_results WHERE patient_id = $1',
      [patient.id]
    );

    res.json({ patient, notes: notes.rows, labResults: labs.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/:id/export
 * VULNERABLE (A10 - Mishandling of Exceptional Conditions): this route
 * bypasses the shared `authenticate` middleware and re-implements its own
 * token check inline, "to keep it simple." If verification throws for ANY
 * reason - no Authorization header, a malformed token, an expired token -
 * the catch block treats that as fine and lets the request through as an
 * anonymous user, instead of denying it. The intent was clearly to require
 * login; the exceptional path fails OPEN instead of closed, so sending no
 * token at all (or garbage) bypasses auth entirely on this one endpoint.
 */
async function exportPatientRecord(req, res, next) {
  let requester = { role: 'unknown' };
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    requester = verifyToken(token); // throws on missing/invalid/expired token
  } catch (err) {
    // Bug: swallow the error and continue instead of returning 401 here.
  }

  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ exportedBy: requester, patient: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves the doctors.id row for a user, if they're a doctor. Returns
 * null for non-doctor roles (admin acting on a note doesn't need one).
 */
async function resolveDoctorId(userId) {
  const result = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * PUT /api/patients/:id/notes/:noteId  { content }
 * Doctors may only edit their own notes; admins may edit any note.
 */
async function updateNote(req, res, next) {
  try {
    const { id, noteId } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const noteResult = await pool.query(
      'SELECT * FROM medical_notes WHERE id = $1 AND patient_id = $2',
      [noteId, id]
    );
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (req.user.role === 'doctor') {
      const doctorId = await resolveDoctorId(req.user.id);
      if (noteResult.rows[0].doctor_id !== doctorId) {
        return res.status(403).json({ error: 'You can only edit your own notes' });
      }
    }

    const updated = await pool.query(
      'UPDATE medical_notes SET content = $1 WHERE id = $2 RETURNING *',
      [content, noteId]
    );
    res.json({ note: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/patients/:id/notes/:noteId
 * Same ownership rule as updateNote.
 */
async function deleteNote(req, res, next) {
  try {
    const { id, noteId } = req.params;

    const noteResult = await pool.query(
      'SELECT * FROM medical_notes WHERE id = $1 AND patient_id = $2',
      [noteId, id]
    );
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (req.user.role === 'doctor') {
      const doctorId = await resolveDoctorId(req.user.id);
      if (noteResult.rows[0].doctor_id !== doctorId) {
        return res.status(403).json({ error: 'You can only delete your own notes' });
      }
    }

    await pool.query('DELETE FROM medical_notes WHERE id = $1', [noteId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients  (admin only — enforced at the route level)
 */
async function createPatient(req, res, next) {
  const client = await pool.connect();

  try {
    const {
      full_name,
      dob,
      aadhar,
      phone,
      gender,
      address,
      assigned_doctor_id,
      latest_labreport,
    } = req.body;

    if (!full_name || !assigned_doctor_id) {
      return res
        .status(400)
        .json({ error: "full_name and assigned_doctor_id are required" });
    }

    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO patients
        (full_name, dob, aadhar, phone, address, assigned_doctor_id, gender,patient_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        full_name,
        dob || null,
        aadhar || null,
        phone || null,
        address || null,
        assigned_doctor_id,
        gender || null,
        "new", // default status for new patients
      ],
    );

    const patientId = result.rows[0].id;

    await client.query(
      `INSERT INTO lab_results
        (patient_id, external_lab_url, result_data, fetched_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        patientId,
        "Initial lab result - No URL",
        JSON.stringify(latest_labreport || "No lab report provided"),
      ],
    );


    await client.query("COMMIT");

    return res.status(201).json({
      patient: result.rows[0],
    });
  } catch (err) {

    await client.query("ROLLBACK");

    next(err);
  } finally {
    client.release();
  }
}

/**
 * PUT /api/patients/:id  (admin only)
 */
async function updatePatient(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, dob, aadhar, phone, address, assigned_doctor_id } = req.body;
    const result = await pool.query(
      `UPDATE patients SET
         full_name = COALESCE($1, full_name),
         dob = COALESCE($2, dob),
         aadhar = COALESCE($3, aadhar),
         phone = COALESCE($4, phone),
         address = COALESCE($5, address),
         assigned_doctor_id = COALESCE($6, assigned_doctor_id)
       WHERE id = $7 RETURNING *`,
      [full_name, dob, aadhar, phone, address, assigned_doctor_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ patient: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/patients/:id  (admin only)
 * medical_notes and lab_results cascade-delete via FK ON DELETE CASCADE.
 */
async function deletePatient(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function updatePatientStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const result = await pool.query(
      'UPDATE patients SET patient_status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ patient: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
module.exports = {
  searchPatients,
  getPatientById,
  addNote,
  updateNote,
  deleteNote,
  fetchLabResult,
  getMyRecord,
  exportPatientRecord,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientsByFilter,
  updatePatientStatus,
};
