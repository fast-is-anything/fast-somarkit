// -----------------------------------------------------------------------------
// Google Sign-In (OAuth 2.0 authorization-code flow) + signed session cookies
// -----------------------------------------------------------------------------

import { sign, unsign, getCookie, setCookie, clearCookie, randomToken, sha256Base64Url, redirect, secureIfHttps } from './crypto.js';
import { findAdminByEmail, upsertAdminOnLogin, logAudit } from './db.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const SESSION_COOKIE = 'somarkit_session';
export const OAUTH_STATE_COOKIE = 'somarkit_oauth';
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

/** Base URL for the current request, honouring the bound custom domain. */
export function originOf(request, env) {
  const url = new URL(request.url);
  // Prefer the canonical site URL when we are on it (or on a workers.dev alias).
  if (env.SITE_URL && !url.hostname.endsWith('workers.dev') && url.hostname !== 'localhost') {
    return env.SITE_URL.replace(/\/$/, '');
  }
  return url.origin;
}

export function redirectUri(request, env) {
  return `${originOf(request, env)}/admin/auth/callback`;
}

export function isConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET);
}

export function adminAllowList(env) {
  return String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Start the OAuth dance. */
export async function beginLogin(request, env) {
  if (!isConfigured(env)) {
    return new Response(renderConfigHelp(env), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const state = randomToken(16);
  const verifier = randomToken(32);
  // PKCE S256: code_challenge = BASE64URL(SHA256(verifier)), unpadded.
  // Using a hex digest here makes Google reject the exchange with
  // "invalid_grant: Invalid code verifier".
  const challenge = await sha256Base64Url(verifier);

  const payload = JSON.stringify({ state, verifier, next: '/admin', ts: Date.now() });
  const sealed = await sign(payload, env.SESSION_SECRET);

  const url = new URL(GOOGLE_AUTH);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri(request, env));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');

  const res = redirect(url.toString());
  res.headers.append(
    'Set-Cookie',
    secureIfHttps(request, setCookie(OAUTH_STATE_COOKIE, sealed, { maxAge: 600, path: '/admin' }))
  );
  return res;
}

/** Handle the callback from Google. */
export async function completeLogin(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return errorPage(env, `Google 返回错误：${error}`);
  if (!code || !state) return errorPage(env, '回调缺少 code 或 state 参数。');

  const sealed = getCookie(request, OAUTH_STATE_COOKIE);
  const raw = await unsign(sealed, env.SESSION_SECRET);
  if (!raw) return errorPage(env, '登录状态已过期或校验失败，请重新登录。');

  let saved;
  try { saved = JSON.parse(raw); } catch { return errorPage(env, '登录状态解析失败。'); }
  if (!saved || saved.state !== state) return errorPage(env, 'state 校验失败（可能是 CSRF 攻击），请重新登录。');
  if (Date.now() - saved.ts > 10 * 60 * 1000) return errorPage(env, '登录超时，请重新登录。');

  // Exchange the code for tokens
  let tokenRes;
  try {
    tokenRes = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(request, env),
        grant_type: 'authorization_code',
        code_verifier: saved.verifier,
      }),
    });
  } catch (e) {
    return errorPage(env, `无法连接 Google：${e.message}`);
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    return errorPage(env, `换取 token 失败（${tokenRes.status}）：${body.slice(0, 300)}`);
  }
  const tokens = await tokenRes.json();

  // Fetch the profile
  const profRes = await fetch(GOOGLE_USERINFO, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profRes.ok) return errorPage(env, `获取用户信息失败（${profRes.status}）。`);
  const profile = await profRes.json();

  const email = String(profile.email || '').toLowerCase();
  const emailVerified = profile.email_verified === true || profile.email_verified === 'true';
  if (!email) return errorPage(env, 'Google 账号未返回邮箱地址。');

  // Authorisation: allow-list AND an existing active admin row (bootstrapped below)
  const allow = adminAllowList(env);
  let admin = await findAdminByEmail(env.DB, email);

  if (allow.includes(email)) {
    if (!admin) {
      admin = await upsertAdminOnLogin(env.DB, {
        email,
        name: profile.name || '',
        picture: profile.picture || '',
      });
      await env.DB.prepare("UPDATE admins SET role = 'owner' WHERE email = ?").bind(email).run();
      admin = await findAdminByEmail(env.DB, email);
    }
  }

  if (!admin) {
    await logAudit(env.DB, email, 'login.denied', 'admin', null, emailVerified ? '不在管理员名单' : '邮箱未验证');
    return forbiddenPage(env, email);
  }

  if (!emailVerified) return errorPage(env, 'Google 账号邮箱尚未验证，无法登录。');

  admin = await upsertAdminOnLogin(env.DB, {
    email,
    name: profile.name || admin.name,
    picture: profile.picture || admin.picture,
  });

  const session = JSON.stringify({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    picture: admin.picture,
    role: admin.role,
    iat: Date.now(),
  });
  const token = await sign(session, env.SESSION_SECRET);
  await logAudit(env.DB, email, 'login.success', 'admin', admin.id, '');

  const res = redirect('/admin');
  res.headers.append('Set-Cookie', secureIfHttps(request, setCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL, path: '/' })));
  res.headers.append('Set-Cookie', clearCookie(OAUTH_STATE_COOKIE));
  return res;
}

/** Return the signed-in admin or null. */
export async function currentAdmin(request, env) {
  if (!env.SESSION_SECRET) return null;
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const raw = await unsign(token, env.SESSION_SECRET);
  if (!raw) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || !data.email) return null;
  if (data.iat && Date.now() - data.iat > SESSION_TTL * 1000) return null;
  // Re-check that the admin still exists and is active
  const admin = await findAdminByEmail(env.DB, data.email);
  if (!admin) return null;
  return admin;
}

export function logout(request, env) {
  const res = redirect('/admin/login');
  res.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
  return res;
}
// --- small HTML pages -------------------------------------------------------

function shell(env, title, body) {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · ${env.SITE_NAME || 'SoMarkIt'}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
    background:#FAFAF9;color:#0F172A;line-height:1.6}
  @media (prefers-color-scheme:dark){body{background:#0B1120;color:#F1F5F9}
    .card{background:#111C33!important;border-color:#1E293B!important}
    code{background:#1E293B!important}}
  .card{background:#fff;border:1px solid #E7E5E4;border-radius:16px;padding:32px;max-width:520px;
    box-shadow:0 8px 24px rgba(15,23,42,.08)}
  h1{margin:0 0 8px;font-size:1.25rem}
  p{margin:0 0 12px;color:#44403C}
  @media (prefers-color-scheme:dark){p{color:#CBD5E1}}
  code{background:#F5F5F4;padding:1px 5px;border-radius:4px;font-size:.85em}
  .btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 18px;
    background:#0F172A;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;font-size:.9rem}
  @media (prefers-color-scheme:dark){.btn{background:#F1F5F9;color:#0F172A}}
  ul{margin:8px 0 16px;padding-left:20px;font-size:.9rem}
</style></head><body><div class="card">${body}</div></body></html>`;
}

function errorPage(env, message) {
  return new Response(
    shell(env, '登录失败', `<h1>登录失败</h1><p>${message}</p><p><a class="btn" href="/admin/login">重新登录</a></p>`),
    { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

function forbiddenPage(env, email) {
  return new Response(
    shell(
      env,
      '无访问权限',
      `<h1>无访问权限</h1>
       <p>账号 <code>${email}</code> 不在管理员名单中。</p>
       <p>如需开通，请让站长在 <code>ADMIN_EMAILS</code> 或后台“管理员”页面添加此邮箱。</p>
       <p><a class="btn" href="/">返回首页</a></p>`
    ),
    { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

function renderConfigHelp(env) {
  return shell(
    env,
    '需要配置 Google 登录',
    `<h1>需要配置 Google 登录</h1>
     <p>请在 Cloudflare Worker 中设置以下密钥后重试：</p>
     <ul>
       <li><code>GOOGLE_CLIENT_ID</code></li>
       <li><code>GOOGLE_CLIENT_SECRET</code></li>
       <li><code>SESSION_SECRET</code>（任意随机长字符串）</li>
     </ul>
     <p>Google Cloud Console → 凭据 → OAuth 客户端，授权重定向 URI 填：</p>
     <p><code>${redirectUri(new Request('https://somarkit.com/admin/login'), env)}</code></p>`
  );
}
