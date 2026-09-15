const fs = require('fs');
const path = require('path');

const LOG_PATH = process.env.RASP_LOG_PATH || path.join(process.cwd(), 'rasp-findings.jsonl');

function logFinding(finding) {
  const record = { timestamp: new Date().toISOString(), ...finding };
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
  } catch (err) {
    console.error('[RASP] failed to write finding:', err.message);
  }
  console.warn(`[RASP] BLOCKED ${finding.owasp} - ${finding.rule}: ${finding.message}`);
}

module.exports = { logFinding, LOG_PATH };
