---
name: add-locale
description: 给 SoMarkit 新增一种界面/内容语言（例如日语 ja、韩语 ko）。当用户说「加一种语言」「支持日语」「新增语言」「加 xx 语种」时使用。涵盖数据库列、LANGS 注册、UI 字典、表单与渲染，全部按当前架构的约定执行。
---

# 新增一种语言

SoMarkit 的多语言是**由 `LANGS` 单点驱动**的：后台的输入框、Tab、预览区都会自动扩展。
但**数据列、UI 文案、SQL 读写**仍需手动补齐。按下面的顺序做，缺一不可。

## 0. 先确认当前架构

```bash
# 当前语言列表 —— 一切的中心
sed -n '1,30p' src/lib/i18n.js
```

关键事实（改动前请核对是否仍然成立）：

| 位置 | 行为 |
|---|---|
| `LANGS` | 语言列表；**第一个即默认语言** |
| 默认语言 | 用裸列（`name`、`description`、`tags`、`review_md`） |
| 其他语言 | 用 `<field>_<code>`（`name_en`、`review_md_ja` …） |
| 回退规则 | 译文为空 → 显示默认语言内容 |
| URL | `/<code>/...`；无前缀渲染默认语言但 noindex |

---

## 第 1 步：注册语言

编辑 `src/lib/i18n.js` 第 1 个常量：

```js
export const LANGS = [
  { code: 'zh', label: '中文', short: '中' },
  { code: 'en', label: 'English', short: 'EN' },
  // 👇 追加，不要插到第一位（第一位是默认语言）
  { code: 'ja', label: '日本語', short: '日' },
];
```

> ⚠️ **绝不能插到数组第一位。** 默认语言的裸列名（`name` 而非 `name_zh`）是数据库结构的一部分，
> 调换顺序会读错列。

---

## 第 2 步：补 UI 字典

`src/lib/i18n.js` 中的 `DICT` 是**按语言分组的对象**，缺了会回退默认语言（页面不会崩，但会中英混杂）。

```js
const DICT = {
  zh: { /* … */ },
  en: { /* … */ },
  ja: { /* 👈 复制 en 的键，逐个翻译 */ },
};
```

检查是否漏键（已内置脚本，`zh` 为基准）：

```bash
node scripts/check-i18n.mjs
# 或
npm run check:i18n
```

输出示例：

```
基准（zh）: 94 个键
✓ zh: 94 个键，完全对齐
✓ en: 94 个键，完全对齐
✗ ja: 缺少 12 个键 → nav.allTools, nav.search, …
```

> `t()` 在缺键时回退到默认语言，所以漏翻译**不会报错**，只会中英混杂——务必跑这个脚本核对。

---

## 第 3 步：数据库迁移

新建 `db/migrations/00X_add_<code>_columns.sql`：

```sql
-- 工具：名称、简介、标签、评测正文
ALTER TABLE tools ADD COLUMN name_ja TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN description_ja TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN tags_ja TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN review_md_ja TEXT NOT NULL DEFAULT '';

-- 分类：名称、描述
ALTER TABLE categories ADD COLUMN name_ja TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN description_ja TEXT NOT NULL DEFAULT '';
```

同步更新 `db/schema.sql`（新建库要直接带上这些列）。

执行：

```bash
# 本地
npx wrangler d1 execute somarkit --local --file=./db/migrations/00X_add_ja_columns.sql

# 生产（部署前）
npx wrangler d1 execute somarkit --remote --file=./db/migrations/00X_add_ja_columns.sql
```

**列名必须严格是 `<字段>_<code>`**，代码按这个约定自动拼接。

---

## 第 4 步：确认代码已自动适配

以下位置**已经**由 `LANGS` 驱动，正常情况下无需改动，但请逐一确认：

### 4.1 数据读写 —— `src/lib/db.js`

```js
const TOOL_I18N_FIELDS = ['name', 'description', 'tags', 'review_md'];
const TOOL_I18N_COLUMNS = LANGS.slice(1).flatMap((l) =>
  TOOL_I18N_FIELDS.map((f) => `${f}_${l.code}`)
);
const CATEGORY_I18N_COLUMNS = LANGS.slice(1).flatMap((l) =>
  ['name', 'description'].map((f) => `${f}_${l.code}`)
);
```

`createTool` / `updateTool` / `createCategory` / `updateCategory` 用这些常量生成 SQL，
**新增语言自动包含新列**。

### 4.2 表单解析 —— `src/index.js`

```js
function readLocalizedFields(body)      // 工具
function readLocalizedCategoryFields(body) // 分类
```

按 `LANGS` 循环读取 `body[`${field}_${code}`]`，自动扩展。

### 4.3 本地化 —— `src/lib/localize.js`

`localizeTool` / `localizeCategory` 都用：

```js
const forLang = (field) =>
  translated ? pick(item[`${field}_${code}`], item[field]) : pick(item[field]);
```

自动支持任意语言。

### 4.4 后台界面 —— `src/templates/admin.js`

语言 Tab、输入框、评测编辑器、预览区全部由 `LANGS.map(...)` 生成。
**新增语言后刷新编辑页，Tab 就会自动多一个。**

### 4.5 前台 —— `src/templates/public.js`

`toolPage` 直接读 `tool.review_md`（已本地化），语言切换器由 `LANGS` 生成。

### 4.6 搜索 —— `src/index.js`

`/api/search` 的 haystack 遍历 `LANGS` 收集所有语言的字段。

---

## 第 5 步：验证清单

```bash
# 语法
for f in $(find src -name '*.js'); do node --check "$f" || echo "FAIL $f"; done

# 启动
npx wrangler dev --port 8787 --ip 127.0.0.1
```

逐项确认：

- [ ] `/<code>` 与 `/<code>/tools/<slug>` 返回 200
- [ ] 页面 `<html lang>` 正确（可能需要补 `head()` 里的映射，见下）
- [ ] 后台工具编辑页出现新语言的 Tab
- [ ] 在 Tab 里填写内容 → 保存 → 前台对应语言页面显示
- [ ] 译文留空 → 前台回退默认语言（不是空白）
- [ ] `/sitemap.xml` 包含 `/<code>/...` URL
- [ ] 语言切换器能在新语言与其它语言间跳转
- [ ] `/api/search` 能搜到新语言的关键词

---

## 常见遗漏（都是真实踩过的坑）

### ① `html lang` 与 `og:locale`

`src/templates/public.js` 的 `head()` 里：

```js
const htmlLang = normalizeLang(lang) === 'en' ? 'en' : 'zh-CN';   // ← 硬编码
const ogLocale = normalizeLang(lang) === 'en' ? 'en_US' : 'zh_CN';
```

新增语言时**必须扩展这两个映射**，否则 `<html lang>` 会错成 `zh-CN`，影响 SEO 与朗读。

建议改成表驱动：

```js
const LOCALE_META = { zh: { html: 'zh-CN', og: 'zh_CN' }, en: { html: 'en', og: 'en_US' }, ja: { html: 'ja', og: 'ja_JP' } };
```

### ② 页面内文案的 `isEn` 分支

`aboutPage` / `notFoundPage` / `submitPage` 等有：

```js
const isEn = normalizeLang(lang) === 'en';
title: isEn ? 'About SoMarkIt' : '关于 SoMarkIt'
```

新增语言时需要改写为 `t(lang, 'key')` 走字典，否则新语言会显示中文。

### ③ 前端 JS 的语言判断

`public/assets/site.js` 中：

```js
if (document.documentElement.getAttribute('data-lang') === 'en') { … }
```

用于复数/文案格式，新语言需要补分支或改为 key 表。

### ④ 模板字符串里的转义

在 `public.js` / `admin.js` 的内联 `<script>` 中写 JS 时：

```js
text.split('\n')      // ❌ 在外层模板字符串里会被解析成真实换行 → 语法错误
text.split('\\n')     // ✅
```

HTML 属性里的换行同理，要用实体：

```js
placeholder="第一行&#10;第二行"   // ✅
placeholder="${'第一行\n第二行'}"  // ❌
```

### ⑤ 注释里的尖括号

内联脚本的注释中出现 `<code>` 等字样会被 HTML 解析器当成标签吞掉：

```js
/* 字段名 review_md_<code> */   // ❌ 破坏脚本
/* 字段名 review_md_LANG */     // ✅
```

---

## 提交前

```bash
npx wrangler deploy --dry-run    # 确认打包正常
git add db/migrations db/schema.sql src
git commit -F .git/COMMIT_MSG.txt
```

**部署顺序**：先跑生产迁移（`--remote`），再 `wrangler deploy`。
反过来会让页面查询不存在的列而报错。
