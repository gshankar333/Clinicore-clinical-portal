const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

const pool = require('../config/db');

/**
 * Attaches req.user.doctorId by looking up the doctors row tied to this
 * user's account. Used on routes where a doctor is acting on a patient
 * (e.g. adding a note) so we know which doctor record to attribute it to.
 */
async function requireDoctorProfile(req, res, next) {
  try {
    const result = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'No doctor profile associated with this account' });
    }
    req.user.doctorId = result.rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, authorize, requireDoctorProfile };
