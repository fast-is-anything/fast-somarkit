// -----------------------------------------------------------------------------
// GA4 server-side mirror.
//
// Every recorded click is also sent to Google Analytics 4 through the
// Measurement Protocol, so the numbers in the admin dashboard and in GA come
// from the same event stream. This is the "dual write": D1 is always written
// first (it is authoritative), GA is best-effort and never blocks the user.
//
// Required configuration (Cloudflare secret / var):
//   GA_MEASUREMENT_ID   G-XXXXXXXXXX   (the web stream id)
//   GA_API_SECRET       optional Measurement Protocol API secret; without it
//                       events are still accepted for GA4 web streams but are
//                       not validated in GA4's DebugView.
//
// Sending is skipped entirely when GA_MEASUREMENT_ID is absent.
// -----------------------------------------------------------------------------

const MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/** Hash a stable per-visitor key into the numeric user_id GA4 expects. */
function toGaUserId(visitor) {
  if (!visitor) return undefined;
  let h = 0;
  for (let i = 0; i < visitor.length; i++) {
    h = (h * 31 + visitor.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h));
}

/**
 * Event payload for a tool click.
 * `tool` needs at least id/name/slug/category_name.
 */
export function buildClickEvent({ visitor, tool, country, referer, path }) {
  const params = {
    tool_id: String(tool.id),
    tool_name: tool.name || '',
    tool_slug: tool.slug || '',
    tool_category: tool.category_name || '',
    // GA4's own outbound-click attribute name, so the default reports pick it up.
    outbound: true,
    link_url: tool.url || '',
    engagement_time_msec: 100,
  };
  if (country) params.country_id = country;
  if (referer) params.page_referrer = referer;
  if (path) params.page_location_path = path;
  return params;
}

/**
 * Mirror one click to GA4.
 * Never throws: a GA outage must not affect the site or the D1 log.
 */
export async function sendClickToGa(env, { visitor, tool, country, referer, path }) {
  const measurementId = env.GA_MEASUREMENT_ID;
  if (!measurementId) return { sent: false, reason: 'not_configured' };

  const url = new URL(MP_ENDPOINT);
  url.searchParams.set('measurement_id', measurementId);
  if (env.GA_API_SECRET) url.searchParams.set('api_secret', env.GA_API_SECRET);

  const body = {
    // client_id is required; reuse the anonymous visitor id so GA's users
    // match the D1 distinct-visitor count as closely as possible.
    client_id: visitor || 'unknown',
    user_id: toGaUserId(visitor),
    events: [{ name: 'select_tool', params: buildClickEvent({ visitor, tool, country, referer, path }) }],
  };

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { sent: res.ok, status: res.status };
  } catch (err) {
    return { sent: false, reason: 'network', error: String(err && err.message || err) };
  }
}
