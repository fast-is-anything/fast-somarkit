# SoMarkIt SEO 改造记录

- 日期：2026-11-20
- 原则：不因为暂时没有数据就 noindex / 特殊处理；模板按“以后有 120 条工具”设计
- 线上状态：**99/100（A）**，0 严重、0 高优先级、0 全站问题
- 线上版本：Worker `1d503134`，内容迁移 005 / 006 / 007 已执行

---

## 一、两批改造总览

### 第一批：TDK 与标题结构

| 项 | 状态 | 结果 |
|---|---|---|
| 评测页双 H1 | 完成 | Markdown 标题归一到 H2，一页只有一个 H1 |
| 分类页 H1 + 导语 | 完成 | H1 改为「{分类}工具推荐」，右侧保留精选卡 |
| 首页 description/H1/H2 | 完成 | 修掉 `共 2 个工具, 13.`；H1 含核心词；分类名升级 H2 |
| 评测页 TDK + 正文 H2 | 完成 | 标题模板、H1「工具名 评测」、简介/核心信息/相关 H2 |
| 全站 head/OG/schema | 完成 | OG PNG、按页 keywords、og:type、JSON-LD 语言前缀、SearchAction |
| 关于页 E-E-A-T | 完成 | 6 个 H2、团队/评测标准/独立性/联系、AboutPage + Organization |
| sitemap lastmod | 完成 | 用真实 `updated_at`，不再全写今天 |
| 产品卡片标题 | 完成 | 卡片名从 H3 改为普通 `<div>`，不进入标题大纲 |

### 第二批：内容、内链与抓取

| # | 项 | 状态 | 说明 |
|---:|---|---|---|
| 2 | 评测正文 | 完成 | ChatGPT / Claude 各 4 语言评测，H2 分节 |
| 3 | 分类导语去模板化 | 完成（中文） | 13 个分类写入 150–250 字独立导语；en/ja/ko 仍用短描述 + 通用兜底 |
| 4 | 卡片名称内链 | 完成 | 卡片名链接到 `/{lang}/tools/{slug}`，anchor 用工具名 |
| 5 | 可抓取分页 | 完成 | 保留滚动加载，同时输出 `?page=N` 服务端分页和 `<a>` 链接 |
| 6 | 分类页隐藏 DOM | 完成 | 分类页只渲染当前分类；隐藏卡片从 93 张降为 0 |
| 7 | 作者 + Review schema | 完成 | 页面署名「SoMarkIt 编辑部」；补 `Review`/`author`/`datePublished` |
| 8 | 团队 + Organization | 部分完成 | 新增编辑部介绍；`sameAs` 需要真实社交链接后补 |
| 9 | 面包屑 + 相关分类 | 完成 | 分类页顶部面包屑、底部 6 个相关分类 |
| 10 | www/尾斜杠 301 | 完成 | `www` 和 `/zh/` 都 301 到 `somarkit.com/zh` |
| 1 | 工具库存 | 不做 | 后续分批上线，导入时同步 en/ja/ko 描述 |

---

## 二、第 5 点：滚动加载对 SEO 的影响

原来的行为：

- 分类页首屏只服务端渲染 **9 张卡**；
- 第 10 张以后靠 `IntersectionObserver` 请求 `/api/rail` 追加；
- 爬虫不会主动滚动，所以第 10 个之后的工具在分类页没有可抓取链接，只能靠 sitemap 发现。

现在的行为：

- 保留滚动加载，用户继续无感；
- 同时服务端输出 `?page=2` 分页和「上一页 / 下一页」`<a>` 链接；
- 第 2 页起服务端直接渲染 9 张卡，`paginateActive` 关闭，避免重复追加；
- 分页页自引用 canonical（`/ai-chat?page=2`），不再把所有页都 canonical 到第 1 页；
- 分页页不输出 hreflang，避免指向第 1 页。

结论：滚动加载本身不影响 SEO，前提是**另有一条可抓取的链接路径**。现在两者并存。

---

## 三、线上验收

```bash
npm run seo:audit
```

- 69 个页面 / 68 条 sitemap URL
- **99/100（A）**（第一轮改造前 45/E）
- 严重 0；高 0；中 15；全站问题 0
- 剩余中优先级：
  - 12 条 `thin-category`：空分类，等数据
  - 3 条 `thin-home`：en/ja/ko 首页目前只有 2 个工具

页面抽查：

| 页面 | 结果 |
|---|---|
| `/zh/tools/chatgpt` | 100 分，单 H1，H2 完整，Review schema |
| `/zh/ai-chat` | 100 分，独立导语、面包屑、相关分类 |
| `/zh/ai-agent`（0 工具） | H1 + 2 个 H2，无隐藏卡片，面包屑/相关分类正常 |
| `/zh/ai-chat?page=2` | 200，自引用 canonical，服务端渲染第 2 页 |

---

## 四、内容与迁移

| 文件 | 内容 |
|---|---|
| `db/migrations/005_seo_translations.sql` | 13 分类 + 2 工具的 en/ja/ko 名称/描述/标签 |
| `db/migrations/006_category_intros.sql` | 13 个分类的中文独立导语 |
| `db/migrations/007_tool_reviews.sql` | ChatGPT/Claude 四语言评测正文 |

已执行到线上：

```bash
npx wrangler d1 execute somarkit --remote --file=./db/migrations/005_seo_translations.sql
npx wrangler d1 execute somarkit --remote --file=./db/migrations/006_category_intros.sql
npx wrangler d1 execute somarkit --remote --file=./db/migrations/007_tool_reviews.sql
npm run deploy
```

新库按顺序执行 schema → seed → 005/006/007；`db/seed.sql` 里仍是短分类描述，长导语和评测由迁移补齐。

---

## 五、仍然待补

1. **工具库存**：线上 2 个工具、12 个空分类。后续分批上线时，导入数据要同时带 `description_en/ja/ko`，否则会回退中文。
2. **分类导语翻译**：中文 13 条已独立；en/ja/ko 仍是短描述 + 通用兜底，可按需补。
3. **Organization sameAs**：需要真实的 X / GitHub / 公众号等链接，当前只有 `contactPoint` 和 `email`。
4. **评测评分**：现在没有真实评分，所以没有加 `reviewRating`；有评分体系后再补 `AggregateRating`。
5. **#5 的收益**：分类页 HTML 已只含当前分类，120 工具时不会再下发 93 张隐藏卡。
