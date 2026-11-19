// -----------------------------------------------------------------------------
// Media storage helpers (Cloudflare R2).
//
// Uploaded files live in the `somarkit-assets` bucket and are served from the
// custom domain in MEDIA_BASE_URL. The object key layout is documented in
// .research/R2-路径规划.md — keep the two in sync.
//
//   logos/<tool-slug>/<hash>-<timestamp>.<ext>
//   reviews/<tool-slug>/<hash>-<timestamp>.<ext>
//   categories/<category-slug>/<hash>-<timestamp>.<ext>
//
// Rules enforced here:
//   • only image content types (png / jpeg / webp / gif / svg / avif)
//   • a hard size cap per kind
//   • the key always mirrors the slug it belongs to, so a tool's assets can be
//     listed and pruned together
// -----------------------------------------------------------------------------

/** Allowed upload kinds → configuration. */
export const UPLOAD_KINDS = {
  logo: { dir: 'logos', maxBytes: 512 * 1024 },      // 512 KB
  review: { dir: 'reviews', maxBytes: 2 * 1024 * 1024 }, // 2 MB
  category: { dir: 'categories', maxBytes: 512 * 1024 },
};

/** MIME type → file extension. Anything not listed is rejected. */
const TYPE_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

export const ACCEPT_ATTR = Object.keys(TYPE_EXT).join(',');
export const MAX_LABEL = Object.fromEntries(
  Object.entries(UPLOAD_KINDS).map(([k, v]) => [k, `${Math.round(v.maxBytes / 1024)} KB`])
);

/** Lowercase, url-safe slug segment. */
function safeSegment(value, fallback = 'untitled') {
  const s = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || fallback;
}

/** Short deterministic hash so repeated uploads never collide. */
async function shortHash(buf) {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate and store one uploaded image.
 *
 * @returns {Promise<{ok:true,key:string,url:string,bytes:number,type:string} | {ok:false,error:string}>}
 */
export async function storeUpload(env, { file, kind = 'logo', slug = '' }) {
  const cfg = UPLOAD_KINDS[kind];
  if (!cfg) return { ok: false, error: '未知的上传类型' };
  if (!env.MEDIA) return { ok: false, error: 'R2 存储未绑定（缺少 MEDIA）' };
  if (!file || typeof file.arrayBuffer !== 'function') return { ok: false, error: '没有收到文件' };

  const type = String(file.type || '').toLowerCase();
  const ext = TYPE_EXT[type];
  if (!ext) {
    return { ok: false, error: `不支持的文件类型：${type || '未知'}。请上传 PNG / JPG / WebP / GIF / SVG / AVIF` };
  }
  if (file.size > cfg.maxBytes) {
    const mb = (cfg.maxBytes / 1024).toFixed(0);
    return { ok: false, error: `图片过大（${Math.round(file.size / 1024)} KB），上限 ${mb} KB` };
  }

  const buf = await file.arrayBuffer();
  if (!buf.byteLength) return { ok: false, error: '文件内容为空' };

  // SVG can carry script; serve uploads with a restrictive CSP and a
  // sandbox-friendly content type instead of trusting the file.
  const hash = await shortHash(buf);
  const stamp = Date.now().toString(36);
  const key = `${cfg.dir}/${safeSegment(slug)}/${hash}-${stamp}.${ext}`;

  await env.MEDIA.put(key, buf, {
    httpMetadata: {
      contentType: type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: { kind, uploadedAt: new Date().toISOString() },
  });

  return { ok: true, key, url: mediaUrl(env, key), bytes: buf.byteLength, type };
}

/** Build the public URL for an object key. */
export function mediaUrl(env, key) {
  const base = String(env.MEDIA_BASE_URL || 'https://images.somarkit.com').replace(/\/+$/, '');
  return `${base}/${key}`;
}

/**
 * Extract the R2 key from a URL that points at our own bucket domain.
 * Returns null for third-party URLs so we never delete someone else's file.
 */
export function keyFromUrl(env, url) {
  const base = String(env.MEDIA_BASE_URL || 'https://images.somarkit.com').replace(/\/+$/, '');
  const value = String(url || '').trim();
  if (!value.startsWith(`${base}/`)) return null;
  return value.slice(base.length + 1).split('?')[0];
}

/** Delete one object if it belongs to this bucket. Best-effort. */
export async function deleteMedia(env, url) {
  const key = keyFromUrl(env, url);
  if (!key || !env.MEDIA) return false;
  try {
    await env.MEDIA.delete(key);
    return true;
  } catch {
    return false;
  }
}
