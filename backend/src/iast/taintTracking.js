const { Pool } = require('pg');
const context = require('./context');
const { logFinding } = require('./findingsLogger');

/**
 * A05 - SQL injection. Patches pg.Pool.prototype.query to check whether
 * the query TEXT contains a value that came directly from this request's
 * input, embedded into the string rather than passed as a $1/$2
 * parameter. Also detects writes to audit_logs, used by the behavioral
 * monitor for the A09 check.
 */
function installQueryTaintCheck() {
  const originalQuery = Pool.prototype.query;
  Pool.prototype.query = function (...args) {
    try {
      const text = typeof args[0] === 'string' ? args[0] : args[0] && args[0].text;
      if (typeof text === 'string') {
        const taint = context.findEmbeddedTaint(text);
        if (taint) {
          logFinding({
            rule: 'sql-injection-tainted-query',
            owasp: 'A05',
            message: `SQL query text contains a value from request ${taint.source}.${taint.field}, embedded directly into the query instead of passed as a bound parameter`,
            detail: { query: text.slice(0, 300), taintedValue: taint.value, source: taint.source, field: taint.field },
          });
        }
        if (/insert\s+into\s+audit_logs/i.test(text)) {
          const store = context.getStore();
          if (store) store.auditLogWritten = true;
        }
      }
    } catch (err) {
      // Instrumentation must never break the app it's monitoring.
    }
    return originalQuery.apply(this, args);
  };
}

/**
 * A01 - SSRF. Patches the global fetch() to check whether the URL came
 * directly from request input, with no allow-list applied.
 */
function installFetchTaintCheck() {
  if (typeof global.fetch !== 'function') return;
  const originalFetch = global.fetch;
  global.fetch = function (url, ...rest) {
    try {
      const urlStr = typeof url === 'string' ? url : url && url.toString();
      const taint = urlStr && (context.taintInfo(urlStr) || context.findEmbeddedTaint(urlStr));
      if (taint) {
        logFinding({
          rule: 'ssrf-tainted-fetch',
          owasp: 'A01',
          message: `fetch() called with a URL taken directly from request ${taint.source}.${taint.field}, with no allow-list or private-IP check`,
          detail: { url: urlStr, source: taint.source, field: taint.field },
        });
      }
    } catch (err) {
      // Instrumentation must never break the app it's monitoring.
    }
    return originalFetch.call(this, url, ...rest);
  };
}

/**
 * A08 - code injection. Wraps the global Function constructor in a Proxy
 * that only traps `construct` - everything else passes straight through to the original, so normal JS engine
 * internals that rely on Function are unaffected. Flags when the
 * function body string contains a value from request input.
 */
function installFunctionConstructorTaintCheck() {
  const OriginalFunction = global.Function;
  global.Function = new Proxy(OriginalFunction, {
    construct(target, args) {
      try {
        const body = args[args.length - 1];
        const taint = typeof body === 'string' ? context.findEmbeddedTaint(body) : null;
        if (taint) {
          logFinding({
            rule: 'code-injection-new-function',
            owasp: 'A08',
            message: `new Function() invoked with code derived from request ${taint.source}.${taint.field} - arbitrary code execution`,
            detail: { body: String(body).slice(0, 300), source: taint.source, field: taint.field },
          });
        }
      } catch (err) {
        // Instrumentation must never break the app it's monitoring.
      }
      return Reflect.construct(target, args);
    },
  });
}

function install() {
  installQueryTaintCheck();
  installFetchTaintCheck();
  installFunctionConstructorTaintCheck();
}

module.exports = { install };
