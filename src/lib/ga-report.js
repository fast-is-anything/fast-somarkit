// -----------------------------------------------------------------------------
// GA4 Data API client (Cloudflare Worker flavour).
//
// Workers have no Node crypto/googleapis, so the RS256 JWT is signed with
// WebCrypto and exchanged for an OAuth access token directly against Google.
//
// Configuration (Worker secrets unless noted):
//   GA_PROPERTY_ID        numeric GA4 property id (NOT the measurement id)
//   GA_SERVICE_ACCOUNT    the whole service-account JSON as a string
//                         (or GA_SA_CLIENT_EMAIL + GA_SA_PRIVATE_KEY separately)
//
// All calls are cached in-memory per isolate for CACHE_TTL_MS, because the
// GA4 Data API has a daily quota and the dashboard polls it on every visit.
// -----------------------------------------------------------------------------

const TOKEN_TTL_MS = 50 * 60 * 1000;   // tokens are valid 60min; refresh early
const CACHE_TTL_MS = 10 * 60 * 1000;   // per-isolate report cache

let tokenCache = { value: '', expires: 0 };
const reportCache = new Map();

/** base64url encode an ArrayBuffer or string. */
function b64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** PEM (PKCS#8) → ArrayBuffer suitable for crypto.subtle.importKey. */
function pemToPkcs8(pem) {
  const body = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '\n')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Read service-account credentials from the environment. */
function readServiceAccount(env) {
  if (env.GA_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(env.GA_SERVICE_ACCOUNT);
      if (sa.client_email && sa.private_key) return sa;
    } catch { /* fall through to split vars */ }
  }
  if (env.GA_SA_CLIENT_EMAIL && env.GA_SA_PRIVATE_KEY) {
    return {
      client_email: env.GA_SA_CLIENT_EMAIL,
      private_key: env.GA_SA_PRIVATE_KEY,
      token_uri: 'https://oauth2.googleapis.com/token',
    };
  }
  return null;
}

export function isGaConfigured(env) {
  return Boolean(env.GA_PROPERTY_ID && readServiceAccount(env));
}

/** Sign a JWT assertion and trade it for an access token (cached). */
async function getAccessToken(env) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expires > now) return tokenCache.value;

  const sa = readServiceAccount(env);
  if (!sa) throw new Error('GA service account not configured');

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const iat = Math.floor(now / 1000);
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  }));
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`GA token error ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);

  tokenCache = { value: body.access_token, expires: now + TOKEN_TTL_MS };
  return body.access_token;
}

/** POST a report request to the Data API, with per-isolate caching. */
async function runReport(env, payload) {
  const cacheKey = `${env.GA_PROPERTY_ID}:${JSON.stringify(payload)}`;
  const hit = reportCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.value;

  const token = await getAccessToken(env);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${env.GA_PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`GA report error ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);

  reportCache.set(cacheKey, { value: body, expires: Date.now() + CACHE_TTL_MS });
  return body;
}

/** Turn a GA response into [{ date, value }] keyed by YYYY-MM-DD. */
function rowsToDaily(report) {
  const out = {};
  for (const row of report.rows || []) {
    const raw = row.dimensionValues?.[0]?.value || '';
    // GA returns YYYYMMDD; normalise to YYYY-MM-DD.
    const day = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
    out[day] = Number(row.metricValues?.[0]?.value || 0);
  }
  return out;
}

/**
 * Daily GA4 series for the admin chart:
 *   clicks   — eventCount of our `select_tool` event
 *   visitors — totalUsers
 *
 * Returns `{ ok:false, reason }` instead of throwing, so the dashboard can
 * still render the D1 side when GA is down or unconfigured.
 */
export async function gaDailySeries(env, { days = 30 } = {}) {
  if (!isGaConfigured(env)) return { ok: false, reason: 'not_configured' };
  const dateRanges = [{ startDate: `${days - 1}daysAgo`, endDate: 'today' }];
  try {
    const [clicks, users] = await Promise.all([
      runReport(env, {
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'select_tool' } },
        },
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: days + 5,
      }),
      runReport(env, {
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'totalUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: days + 5,
      }),
    ]);
    return { ok: true, clicks: rowsToDaily(clicks), visitors: rowsToDaily(users) };
  } catch (err) {
    console.error('GA report failed', err && err.message || err);
    return { ok: false, reason: 'error', message: String(err && err.message || err) };
  }
}

/** Reset the memo caches (used by the manual refresh action). */
export function clearGaCache() {
  reportCache.clear();
  tokenCache = { value: '', expires: 0 };
}
