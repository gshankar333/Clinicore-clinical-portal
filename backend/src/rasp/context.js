const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/**
 * Same tagging mechanism as iast/context.js. Kept as a separate copy
 * (not shared) so IAST and RASP remain independently toggleable modules
 * with no coupling between them.
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

  const store = { taintedValues };
  als.run(store, () => next());
}

function getStore() {
  return als.getStore();
}

function taintInfo(value) {
  const store = getStore();
  if (!store || typeof value !== 'string') return null;
  return store.taintedValues.get(value) || null;
}

function findEmbeddedTaint(text) {
  const store = getStore();
  if (!store || typeof text !== 'string') return null;
  for (const [value, info] of store.taintedValues.entries()) {
    if (value.length > 0 && text.includes(value)) return { value, ...info };
  }
  return null;
}

module.exports = { taintMiddleware, getStore, taintInfo, findEmbeddedTaint };
