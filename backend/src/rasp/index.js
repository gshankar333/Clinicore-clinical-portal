const protection = require('./protection');
const context = require('./context');
const { raspErrorHandler } = require('./blockHandler');
const { LOG_PATH } = require('./findingsLogger');

/**
 * Installed once at startup. NOTE: patches the same globals IAST does
 * (pg.Pool.query, fetch, Function). RASP and IAST are designed to run in
 * separate pipeline stages (IAST during test exercise, RASP during
 * "production simulation") - running both together in the same process
 * is untested and not the intended usage.
 */
function install() {
  protection.install();
  console.log(`[RASP] Protection active. Blocked-request log: ${LOG_PATH}`);
}

function taintMiddleware() {
  return context.taintMiddleware;
}

function errorHandler() {
  return raspErrorHandler();
}

module.exports = { install, taintMiddleware, errorHandler };
