// -----------------------------------------------------------------------------
// Cookie + signed-session helpers (WebCrypto, no dependencies)
// -----------------------------------------------------------------------------

const enc = new TextEncoder();

function b64urlEncode(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function sign(payload, secret) {
  const data = enc.encode(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return `${b64urlEncode(data)}.${b64urlEncode(sig)}`;
}

export async function unsign(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return null;
  const dataPart = token.slice(0, idx);
  const sigPart = token.slice(idx + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      'HMAC', key, b64urlDecode(sigPart), b64urlDecode(dataPart)
    );
    if (!ok) return null;
    return new TextDecoder().decode(b64urlDecode(dataPart));
  } catch {
    return null;
  }
}

// --- cookies ----------------------------------------------------------------

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return null;
}

export function setCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  parts.push('SameSite=Lax');
  if (opts.secure === true) parts.push('Secure');
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  return parts.join('; ');
}

/**
 * Wrap a Set-Cookie value so the Secure flag is only added on HTTPS origins.
 * This keeps local `wrangler dev` (http://localhost) working while production
 * on somarkit.com stays HTTPS-only.
 */
export function secureIfHttps(request, cookie) {
  try {
    if (new URL(request.url).protocol === 'https:') {
      return cookie.includes('; Secure') ? cookie : `${cookie}; Secure`;
    }
  } catch { /* ignore */ }
  return cookie;
}

export function clearCookie(name) {
  return setCookie(name, '', { maxAge: 0, https: false });
}

export function appendCookie(headers, cookie) {
  headers.append('Set-Cookie', cookie);
}

// --- misc -------------------------------------------------------------------

export function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return b64urlEncode(arr);
}

export async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 digest encoded as base64url (no padding).
 * This is the encoding PKCE "S256" requires for a code_challenge — a hex
 * digest is NOT valid there and yields "160" / "Invalid code verifier".
 */
export async function sha256Base64Url(input) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return b64urlEncode(digest); // b64urlEncode already strips padding
}

/** Constant-time-ish string compare. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += values[i] ?? '';
  }
  return out;
}

export function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function redirect(location, headers = {}) {
  const h = new Headers(headers);
  h.set('Location', location);
  return new Response(null, { status: 302, headers: h });
}

export function parseBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return request.json();
  return request.formData().then((fd) => Object.fromEntries(fd.entries()));
}
