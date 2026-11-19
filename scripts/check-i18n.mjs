// 检查 UI 字典各语言键是否齐全。
// 用法：node scripts/check-i18n.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/lib/i18n.js'), 'utf8');

/** 取出 DICT 中某个语言的完整代码块。 */
function blockFor(code) {
  const m = src.match(new RegExp(`^  ${code}: \\{`, 'm'));
  if (!m) return null;
  let depth = 0;
  let end = -1;
  for (let i = m.index; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  return src.slice(m.index, end);
}

const zhBlock = blockFor('zh');
if (!zhBlock) {
  console.error('未找到 zh 字典块');
  process.exit(1);
}
const zhKeys = [...zhBlock.matchAll(/'([a-zA-Z][\w.]*)':/g)].map((m) => m[1]);

// 所有在 DICT 里出现的语言代码
const codes = [...new Set([...src.matchAll(/^  ([a-z]{2,3}): \{/gm)].map((m) => m[1]))];

let failed = false;
console.log(`基准（zh）: ${zhKeys.length} 个键\n`);

for (const code of codes) {
  const blk = blockFor(code);
  if (!blk) continue;
  const have = new Set([...blk.matchAll(/'([a-zA-Z][\w.]*)':/g)].map((m) => m[1]));
  const missing = zhKeys.filter((k) => !have.has(k));
  const extra = [...have].filter((k) => !zhKeys.includes(k));

  if (missing.length) {
    failed = true;
    console.log(`✗ ${code}: 缺少 ${missing.length} 个键 → ${missing.slice(0, 8).join(', ')}`);
  } else if (extra.length) {
    console.log(`~ ${code}: 多出 ${extra.length} 个键（zh 中没有）→ ${extra.slice(0, 8).join(', ')}`);
  } else {
    console.log(`✓ ${code}: ${have.size} 个键，完全对齐`);
  }
}

process.exit(failed ? 1 : 0);
