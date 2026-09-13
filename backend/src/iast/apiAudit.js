const crypto = require('crypto');
const { logFinding } = require('./findingsLogger');

const WEAK_ALGORITHMS = new Set(['md5', 'sha1']);

/**
 * A06 - insecure design. Patches crypto.createHash to flag algorithms
 * that are always unsuitable for security purposes (tokens, signatures),
 * regardless of how they're used. Complements (not duplicates) the SAST
 * rule for unsalted SHA-256 password hashing - this hook catches the
 * separate MD5-based reset-token weakness at runtime, with a real stack
 * trace showing exactly where it fired.
 */
function installWeakHashCheck() {
  const originalCreateHash = crypto.createHash;
  crypto.createHash = function (algorithm, ...rest) {
    try {
      if (WEAK_ALGORITHMS.has(String(algorithm).toLowerCase())) {
        const stackLine = new Error().stack.split('\n')[2] || '';
        // Only flag calls originating from our own application code.
        // Express and various dependencies call createHash('sha1') routinely
        // for entirely benign, non-security purposes - flagging those
        // would flood real findings with noise.
        if (stackLine.includes('/src/') && !stackLine.includes('/node_modules/')) {
          logFinding({
            rule: 'weak-hash-algorithm-used',
            owasp: 'A06',
            message: `crypto.createHash('${algorithm}') called at runtime - unsuitable for security-sensitive hashing (tokens, passwords, signatures)`,
            detail: { algorithm, calledFrom: stackLine.trim() },
          });
        }
      }
    } catch (err) {
      // Instrumentation must never break the app it's monitoring.
    }
    return originalCreateHash.call(this, algorithm, ...rest);
  };
}

/**
 * A07 - authentication failures. One-time check at startup: is the JWT
 * signing secret long enough to resist brute-force? This isn't a taint
 * or per-request check - it's a live configuration audit of the actual
 * running environment, which is something IAST can do that SAST cannot.
 */
function checkJwtSecretStrength() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32) {
    logFinding({
      rule: 'weak-jwt-secret-at-runtime',
      owasp: 'A07',
      message: `The JWT_SECRET actually in use is only ${secret.length} characters long - too short to resist brute-force. Recommend >= 32 random bytes.`,
      detail: { length: secret.length },
    });
  }
}

/**
 * A02 - security misconfiguration, plus captures the response body onto
 * res.locals for the behavioral monitor's IDOR check to read later.
 */
function responseInspectorMiddleware() {
  return function (req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      try {
        res.locals.__iastBody = body;
        if (body && typeof body === 'object' && 'stack' in body) {
          logFinding({
            rule: 'stack-trace-in-response',
            owasp: 'A02',
            message: 'Response body includes a "stack" field - internal file paths and dependency details are being sent to the client',
            detail: { path: req.originalUrl, statusCode: res.statusCode },
          });
        }
      } catch (err) {
        // Instrumentation must never break the app it's monitoring.
      }
      return originalJson(body);
    };
    next();
  };
}

function install() {
  installWeakHashCheck();
  checkJwtSecretStrength();
}

module.exports = { install, responseInspectorMiddleware };
