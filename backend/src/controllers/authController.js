const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

/**
 * POST /api/auth/register
 * Dev-time convenience endpoint to create users of any role.
 * NOTE: in a real system this would be admin-only / invite-based.
 * Left open for now so we can seed roles easily while building - we'll
 * lock this down when we implement the Admin "Manage Users" flow.
 */
async function register(req, res, next) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }
    if (!['admin', 'doctor', 'patient'].includes(role)) {
      return res.status(400).json({ error: 'role must be admin, doctor, or patient' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
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

/**
 * POST /api/auth/login
 * VULNERABLE (A09 - Logging & Alerting Failures): failed and successful
 * login attempts are not written to audit_logs at all right now. This is
 * intentional - we'll compare "before RASP" vs "after RASP" on this exact
 * endpoint once the RASP middleware is in place.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password  { email }
 * VULNERABLE (A06 - Insecure Design): the reset token is derived
 * deterministically from the email address and the current minute, using
 * no server-side secret and no randomness at all. Anyone who knows a
 * user's email can compute this exact same token themselves - there's
 * nothing to intercept, brute-force, or guess; it's just math.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset token has been generated.' });
    }
    const userId = userResult.rows[0].id;

    const minuteWindow = Math.floor(Date.now() / 60000);
    const token = crypto.createHash('md5').update(`${email}:${minuteWindow}`).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // A real system emails this token instead of returning it. It's
    // returned here only so the flow is testable without an email service -
    // the actual bug is that the token is guessable, not that it's echoed.
    res.json({ message: 'Reset token generated', token });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password  { email, token, newPassword }
 */
async function resetPassword(req, res, next) {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'email, token, and newPassword are required' });
    }

    const result = await pool.query(
      `SELECT prt.user_id FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE u.email = $1 AND prt.token = $2 AND prt.expires_at > NOW()
       ORDER BY prt.id DESC LIMIT 1`,
      [email, token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const passwordHash = hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      result.rows[0].user_id,
    ]);

    res.json({ message: 'Password has been reset' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, forgotPassword, resetPassword };
