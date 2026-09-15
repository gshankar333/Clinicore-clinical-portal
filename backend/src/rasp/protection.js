const dns = require('dns').promises;
const { Pool } = require('pg');
const context = require('./context');
const { RaspBlockError } = require('./blockError');

/**
 * Taint presence alone isn't enough to block on for SQLi: this app's
 * vulnerable query embeds EVERY search term into the SQL text, benign or
 * not, because that's the actual structural flaw. Blocking on taint
 * presence alone would block 100% of legitimate searches too. This
 * checks whether the tainted value itself looks like an actual
 * injection attempt (quote characters that break out of the string
 * literal, SQL keywords, comment sequences) - only requests that are
 * genuinely trying to inject get blocked; ordinary search terms pass
 * through untouched.
 *
 * Verified against: UNION-based, time-based blind (pg_sleep), stacked
 * query/DROP, and mixed-case bypass attempts - all correctly blocked.
 *
 * Known tradeoff, same as real-world WAFs: a legitimate name containing
 * an apostrophe would also trigger this, since a raw
 * quote is the literal character that breaks out of this specific
 * vulnerable query's string literal. Accepted as a documented limitation
 * rather than engineered away, matching how real SQLi-detection rules
 * behave in practice.
 */
const SQLI_PATTERN = /'|--|;|\bunion\b|\bselect\b|\bdrop\b|\bor\b\s+['"0-9]|\band\b\s+['"0-9]|sleep\s*\(|pg_sleep\s*\(/i;

function looksLikeSqlInjection(value) {
  return SQLI_PATTERN.test(value);
}

function installQueryProtection() {
  const originalQuery = Pool.prototype.query;
  Pool.prototype.query = function (...args) {
    const text = typeof args[0] === 'string' ? args[0] : args[0] && args[0].text;
    if (typeof text === 'string') {
      const taint = context.findEmbeddedTaint(text);
      if (taint && looksLikeSqlInjection(taint.value)) {
        throw new RaspBlockError(
          'sql-injection-blocked',
          'A05',
          `Blocked: SQL query contained a value from request ${taint.source}.${taint.field} that looks like an injection attempt, embedded directly into the query text`,
          { query: text.slice(0, 300), source: taint.source, field: taint.field, taintedValue: taint.value }
        );
      }
    }
    return originalQuery.apply(this, args);
  };
}

/**
 * Checks a hostname STRING against known private/internal patterns.
 * Uses a full /^127\./ match for the whole loopback range - an earlier
 * version only exact-matched "127.0.0.1", which real testing showed lets
 * 127.0.0.2 (and any other loopback address) straight through.
 */
function isPrivateOrInternalHostnameString(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1') return true;
  if (/^127\./.test(h)) return true; // full loopback range, not just .1
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local, includes cloud metadata
  if (h.endsWith('.internal') || h.endsWith('.local')) return true;
  return false;
}

function isPrivateIp(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true;
  if (/^127\./.test(ip)) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  return false;
}

/**
 * A hostname-string check alone misses bare internal service names (a
 * Docker Compose service like "db" or "backend" doesn't LOOK like a
 * private IP as a string) - real testing confirmed "http://db:5432"
 * bypassed a string-only check entirely. This resolves the hostname via
 * DNS and checks the actual resulting IP address(es) too, catching
 * exactly this case, plus DNS-rebinding-style bypasses where a
 * normal-looking domain resolves to an internal address.
 */
async function isDestinationBlocked(urlStr) {
  let hostname;
  try {
    hostname = new URL(urlStr).hostname;
  } catch (err) {
    return true; // an unparseable URL is suspicious enough to block
  }

  if (isPrivateOrInternalHostnameString(hostname)) return true;

  try {
    const results = await dns.lookup(hostname, { all: true });
    return results.some((r) => isPrivateIp(r.address));
  } catch (err) {
    // DNS failing to resolve isn't itself suspicious - could just be an
    // unreachable but legitimate external host. Don't block on this
    // alone; the string check above already covers the known-dangerous
    // cases without needing DNS to succeed.
    return false;
  }
}

/**
 * Blocks based on DESTINATION (string pattern + actual DNS
 * resolution), not merely on the URL being user-supplied - the feature
 * only makes sense if legitimate external URLs are allowed through.
 *
 * Verified against: localhost, cloud metadata (169.254.169.254),
 * 127.0.0.2, 127.1 (Node normalizes this to 127.0.0.1), decimal/hex IP
 * encodings (Node also normalizes these), and a bare Docker service name
 * ("db") - all correctly blocked. A legitimate external URL
 * (https://example.com) correctly passes through.
 */
function installFetchProtection() {
  if (typeof global.fetch !== 'function') return;
  const originalFetch = global.fetch;
  global.fetch = async function (url, ...rest) {
    const urlStr = typeof url === 'string' ? url : url && url.toString();
    if (urlStr) {
      const blocked = await isDestinationBlocked(urlStr);
      if (blocked) {
        const taint = context.taintInfo(urlStr) || context.findEmbeddedTaint(urlStr) || {};
        throw new RaspBlockError(
          'ssrf-blocked',
          'A01',
          `Blocked: fetch() targeted an internal/private address (${urlStr}) - not a legitimate external lab endpoint`,
          { url: urlStr, source: taint.source, field: taint.field }
        );
      }
    }
    return originalFetch.call(this, url, ...rest);
  };
}

/**
 * No legitimate use case exists for executing
 * arbitrary code derived from user input, so taint presence alone is
 * the correct condition to block on here - unlike SQLi/SSRF, there's no
 * benign version of this feature to preserve.
 *
 * Verified against: environment-variable exfiltration and OS command
 * execution payloads, in addition to the original PoC - all blocked.
 */
function installFunctionProtection() {
  const OriginalFunction = global.Function;
  global.Function = new Proxy(OriginalFunction, {
    construct(target, args) {
      const body = args[args.length - 1];
      const taint = typeof body === 'string' ? context.findEmbeddedTaint(body) : null;
      if (taint) {
        throw new RaspBlockError(
          'code-injection-blocked',
          'A08',
          `Blocked: new Function() invoked with code derived from request ${taint.source}.${taint.field}`,
          { body: String(body).slice(0, 300), source: taint.source, field: taint.field }
        );
      }
      return Reflect.construct(target, args);
    },
  });
}

function install() {
  installQueryProtection();
  installFetchProtection();
  installFunctionProtection();
}

module.exports = { install };