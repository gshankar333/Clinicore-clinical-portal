/**
 * VULNERABLE (A02 - Security Misconfiguration): returns the raw error
 * message and stack trace to the client. This leaks internal file paths,
 * query fragments, and library versions - useful attacker recon.
 * Intentional for the demo; will be replaced with a generic error
 * response + server-side-only logging in the "fixed" pass.
 */
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message,
    stack: err.stack,
  });
}

module.exports = errorHandler;
