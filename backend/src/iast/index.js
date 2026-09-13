const context = require('./context');
const taintTracking = require('./taintTracking');
const apiAudit = require('./apiAudit');
const { behavioralMiddleware } = require('./behavioralMonitor');
const { LOG_PATH } = require('./findingsLogger');

/**
 * Installs the global, one-time hooks (monkey-patched sinks + startup
 * config audit). Call this ONCE, as early as possible - before any other
 * module requires `pg` or uses `crypto`/`fetch`/`Function` - so the
 * patched versions are the ones everything else picks up.
 */
function install() {
  taintTracking.install();
  apiAudit.install();
  console.log(`[IAST] Instrumentation active. Findings will be written to: ${LOG_PATH}`);
}

/**
 * Per-request middleware chain: tag risky input, capture the outgoing
 * response body for later inspection, then run the end-of-request
 * behavioral checks. Mount this early in the Express middleware chain,
 * after express.json() (so req.body is populated) but before the routes.
 */
function middleware() {
  return [context.taintMiddleware, apiAudit.responseInspectorMiddleware(), behavioralMiddleware()];
}

module.exports = { install, middleware };
