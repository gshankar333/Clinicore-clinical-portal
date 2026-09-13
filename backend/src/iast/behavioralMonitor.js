const pool = require('../config/db');
const { getStore } = require('./context');
const { logFinding } = require('./findingsLogger');

const SENSITIVE_PATTERNS = [
  { test: (m, p) => m === 'POST' && p === '/api/auth/login', action: 'login' },
  { test: (m, p) => m === 'GET' && /^\/api\/patients\/\d+$/.test(p), action: 'view_patient_record' },
  { test: (m, p) => m === 'POST' && /^\/api\/patients\/\d+\/notes$/.test(p), action: 'add_note' },
  { test: (m, p) => m === 'POST' && p === '/api/admin/import', action: 'import_records' },
];

/**
 * A09 - logging and alerting failures. Did a sensitive action complete
 * successfully without a corresponding audit_logs write occurring
 * anywhere during this request? (The write-detection itself lives in
 * taintTracking's query patch, which sets store.auditLogWritten.)
 */
function checkMissingAuditLog(req, res) {
  const store = getStore();
  const path = req.originalUrl.split('?')[0];
  const match = SENSITIVE_PATTERNS.find((p) => p.test(req.method, path));
  if (match && res.statusCode < 400 && store && !store.auditLogWritten) {
    logFinding({
      rule: 'missing-audit-log',
      owasp: 'A09',
      message: `Sensitive action "${match.action}" completed successfully (status ${res.statusCode}) but no audit_logs row was written during this request`,
      detail: { path, method: req.method, statusCode: res.statusCode },
    });
  }
}

/**
 * A10 - mishandling of exceptional conditions. The export endpoint
 * returning 200 without anything resembling a valid Bearer token is the
 * live signature of the fail-open catch block: verification threw, the
 * error was swallowed, and the request proceeded anyway.
 */
function checkFailOpenExport(req, res) {
  const path = req.originalUrl.split('?')[0];
  if (/^\/api\/patients\/\d+\/export$/.test(path) && res.statusCode === 200) {
    const header = req.headers.authorization || '';
    const looksLikeAValidToken = header.startsWith('Bearer ') && header.length > 20;
    if (!looksLikeAValidToken) {
      logFinding({
        rule: 'fail-open-auth-bypass',
        owasp: 'A10',
        message: 'Export endpoint returned 200 with no valid-looking Authorization header - the exception path for a missing/invalid token is failing open instead of denying the request',
        detail: { path, hadAuthHeader: Boolean(header) },
      });
    }
  }
}

/**
 * A01 - broken access control (IDOR). Compares the requesting doctor's
 * own doctor id against the assigned_doctor_id on the patient record
 * that was actually returned. A mismatch proves cross-doctor access
 * occurred with no ownership check - not just that the endpoint lacks
 * one in theory, but that it was actually exploited on this request.
 */
async function checkIdor(req, res) {
  const path = req.originalUrl.split('?')[0];
  if (!/^\/api\/patients\/\d+$/.test(path) || req.method !== 'GET') return;
  if (res.statusCode !== 200) return;
  if (!req.user || req.user.role !== 'doctor') return;

  const body = res.locals.__iastBody;
  if (!body || !body.patient) return;

  try {
    const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    const requesterDoctorId = doctorRow.rows[0] && doctorRow.rows[0].id;
    const ownerDoctorId = body.patient.assigned_doctor_id;

    if (requesterDoctorId && ownerDoctorId && requesterDoctorId !== ownerDoctorId) {
      logFinding({
        rule: 'idor-cross-doctor-patient-access',
        owasp: 'A01',
        message: `Doctor (user id ${req.user.id}, doctor id ${requesterDoctorId}) read a patient assigned to a different doctor (doctor id ${ownerDoctorId}) with no ownership check`,
        detail: { requesterDoctorId, ownerDoctorId, patientId: body.patient.id },
      });
    }
  } catch (err) {
    // Instrumentation must never break the app it's monitoring.
  }
}

function behavioralMiddleware() {
  return function (req, res, next) {
    res.on('finish', () => {
      try {
        checkMissingAuditLog(req, res);
        checkFailOpenExport(req, res);
        checkIdor(req, res); // fire-and-forget; internal errors are caught
      } catch (err) {
        // Instrumentation must never break the app it's monitoring.
      }
    });
    next();
  };
}

module.exports = { behavioralMiddleware };
