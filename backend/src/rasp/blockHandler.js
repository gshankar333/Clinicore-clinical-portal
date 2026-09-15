const pool = require('../config/db');
const { RaspBlockError } = require('./blockError');
const { logFinding } = require('./findingsLogger');

/**
 * Express error-handling middleware. Must be mounted AFTER the routes but before the app's generic error handler,
 * so a blocked request never reaches the verbose stack-trace response.
 * The audit_logs write here is a genuine compensating control: it fires
 * on EVERY blocked request regardless of which rule triggered it,
 * closing the A09 gap without touching a single line of the vulnerable
 * application code.
 */
function raspErrorHandler() {
  return function (err, req, res, next) {
    if (!(err instanceof RaspBlockError)) {
      return next(err);
    }

    logFinding({
      owasp: err.owasp,
      rule: err.rule,
      message: err.message,
      detail: err.detail,
      path: req.originalUrl,
      method: req.method,
    });

    const patientIdParam = req.params && req.params.id ? Number(req.params.id) : null;
    pool
      .query(
        'INSERT INTO audit_logs (user_id, action, target_patient_id, success) VALUES ($1, $2, $3, false)',
        [req.user ? req.user.id : null, `blocked_${err.rule}`, Number.isInteger(patientIdParam) ? patientIdParam : null]
      )
      .catch((auditErr) => {
        console.error('[RASP] failed to write compensating audit log:', auditErr.message);
      });

    res.status(403).json({
      error: 'Request blocked by RASP',
      rule: err.rule,
      owasp: err.owasp,
    });
  };
}

module.exports = { raspErrorHandler };
