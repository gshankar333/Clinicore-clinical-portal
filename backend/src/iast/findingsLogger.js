const fs = require('fs');
const path = require('path');

const LOG_PATH = process.env.IAST_LOG_PATH || path.join(process.cwd(), 'iast-findings.jsonl');

/**
 * Writes one finding per line as JSON (JSON Lines format) - matches the
 * pattern used elsewhere in this pipeline (SARIF for SAST, HTML/JSON for
 * DAST): a machine-readable artifact that can be aggregated later.
 */
function logFinding(finding) {
  const record = {
    timestamp: new Date().toISOString(),
    ...finding,
  };
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
  } catch (err) {
    // Instrumentation must never crash the app it's monitoring.
    console.error('[IAST] failed to write finding:', err.message);
  }
  console.warn(`[IAST] ${finding.owasp} - ${finding.rule}: ${finding.message}`);
}

module.exports = { logFinding, LOG_PATH };
