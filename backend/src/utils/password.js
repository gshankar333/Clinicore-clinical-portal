const crypto = require('crypto');

/**
 * VULNERABLE (A04 - Cryptographic Failures): plain unsalted SHA-256.
 * No salt, no work factor, no per-user randomness -> identical passwords
 * produce identical hashes and the whole table is rainbow-table-able.
 * This is intentional for the project's SAST/DAST demo. The "fixed"
 * version (bcrypt/argon2 with per-user salt) will be introduced later
 * as the before/after comparison for this finding.
 */
function hashPassword(plainText) {
  return crypto.createHash('sha256').update(plainText).digest('hex');
}

function verifyPassword(plainText, storedHash) {
  return hashPassword(plainText) === storedHash;
}

module.exports = { hashPassword, verifyPassword };
