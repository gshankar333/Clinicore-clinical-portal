const pool = require('../config/db');

/**
 * Shared query: returns every patient assigned to a given doctor, with
 * computed age and the date of their most recent medical note.
 */
async function fetchPatientsForDoctor(doctorId) {
  const result = await pool.query(
    `SELECT
       p.id,
       p.full_name,
       p.dob,
       DATE_PART('year', AGE(p.dob::date))::int AS age,
       MAX(mn.created_at) AS last_visit
     FROM patients p
     LEFT JOIN medical_notes mn ON mn.patient_id = p.id
     WHERE p.assigned_doctor_id = $1
     GROUP BY p.id
     ORDER BY p.full_name`,
    [doctorId]
  );
  return result.rows;
}

/**
 * GET /api/doctors/me/patients
 * Doctor's own patient list - this is the default "landing" view after
 * login, scoped correctly to only the doctor's own assigned patients
 * (contrast with GET /api/patients/:id, which has no such scoping — see
 * A01 note in patientController).
 */
async function getMyPatients(req, res, next) {
  try {
    const doctorId = req.user.doctorId; // attached by requireDoctorProfile middleware
    const patients = await fetchPatientsForDoctor(doctorId);
    res.json({ patients });
  } catch (err) {
    next(err);
  }
}

module.exports = { fetchPatientsForDoctor, getMyPatients };
