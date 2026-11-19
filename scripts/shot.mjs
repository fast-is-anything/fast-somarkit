// Simple screenshot helper using Chrome DevTools Protocol over raw WebSocket.
// Usage: node scripts/shot.mjs <url> <outfile> [width] [height] [cookieValue]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [, , url, out = 'shot.png', w = '1440', h = '900', cookie = ''] = process.argv;

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9300 + Math.floor(Math.random() * 500);

const proc = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP}\\cdp-${PORT}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await res.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('CDP not reachable');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
function send(method, params = {}, sessionId) {
  const mid = ++id;
  return new Promise((resolve, reject) => {
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
}

const { targetInfos } = await send('Target.getTargets');
let pageTarget = targetInfos.find((t) => t.type === 'page');
if (!pageTarget) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  pageTarget = { targetId };
}
const { sessionId } = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

const s = (m, p) => send(m, p, sessionId);
await s('Page.enable');
await s('Runtime.enable');
await s('Network.enable');
await s('Emulation.setDeviceMetricsOverride', {
  width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: Number(w) < 700,
});

if (cookie) {
  const u = new URL(url);
  await s('Network.setCookie', {
    name: 'somarkit_session', value: cookie, domain: u.hostname, path: '/',
    secure: false, httpOnly: true, sameSite: 'Lax',
  });
  await s('Network.setCookie', {
    name: 'somarkit-admin-theme', value: 'light', domain: u.hostname, path: '/',
    secure: false,
  });
}

await s('Page.navigate', { url });

// Wait for the page to finish loading before interacting
await new Promise((resolve) => {
  const onLoaded = (ev) => {
    try {
      const m = JSON.parse(ev.data);
      if (m.method === 'Page.loadEventFired') resolve();
    } catch { /* ignore */ }
  };
  ws.addEventListener('message', onLoaded);
  setTimeout(resolve, 6000);
});
await sleep(900);

// Optionally click a selector before shooting (for collapse-state screenshots)
const click = process.argv[7];
if (click) {
  await s('Runtime.evaluate', {
    expression: `(function(){var el=document.querySelector(${JSON.stringify(click)});if(el)el.click();return !!el;})()`,
    awaitPromise: false,
  });
  await sleep(700);
}

const { data } = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(data, 'base64'));
console.log('saved', out);
ws.close();
proc.kill();
process.exit(0);
