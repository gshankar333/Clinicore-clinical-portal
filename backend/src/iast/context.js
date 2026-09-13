const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/**
 * Express middleware: tags every string value from req.body/query/params
 * as "tainted" for the lifetime of this request, and creates a shared
 * mutable store other IAST modules read from/write to as the request
 * proceeds through async code (DB calls, fetch, etc).
 */
function taintMiddleware(req, res, next) {
  const taintedValues = new Map();

  function tag(source, obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [field, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > 0) {
        taintedValues.set(value, { source, field });
      }
    }
  }
  tag('body', req.body);
  tag('query', req.query);
  tag('params', req.params);

  const store = {
    requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: req.method,
    path: req.originalUrl,
    taintedValues,
    auditLogWritten: false,
  };

  als.run(store, () => next());
}

function getStore() {
  return als.getStore();
}

/** Returns {source, field} if this exact string originated from request input, else null. */
function taintInfo(value) {
  const store = getStore();
  if (!store || typeof value !== 'string') return null;
  return store.taintedValues.get(value) || null;
}

/** Checks a SQL/template string for any tainted value embedded inside it (not just exact match). */
function findEmbeddedTaint(text) {
  const store = getStore();
  if (!store || typeof text !== 'string') return null;
  for (const [value, info] of store.taintedValues.entries()) {
    if (value.length > 0 && text.includes(value)) return { value, ...info };
  }
  return null;
}

module.exports = { taintMiddleware, getStore, taintInfo, findEmbeddedTaint };
