/**
 * Thrown by the protection hooks the instant a dangerous call is
 * detected - BEFORE the dangerous operation actually executes. Caught
 * specifically by rasp/blockHandler.js, which turns it into a clean 403
 * response instead of letting it fall through to the app's generic error handler.
 */
class RaspBlockError extends Error {
  constructor(rule, owasp, message, detail) {
    super(message);
    this.name = 'RaspBlockError';
    this.rule = rule;
    this.owasp = owasp;
    this.detail = detail;
  }
}

module.exports = { RaspBlockError };
