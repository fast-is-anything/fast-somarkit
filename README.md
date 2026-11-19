# SoMarkIt — AI 工具导航站

参考 [chengrang.com](https://chengrang.com/) 的视觉与信息结构复刻的 AI 工具导航站，部署在 **Cloudflare Workers + D1**，自带可折叠侧边栏的**管理后台**与 **Google 登录**。

- 生产域名：**https://somarkit.com**
- 品牌名：**SoMarkIt**
- 管理后台：**https://somarkit.com/admin**

---

## 功能概览

### 前台
| 功能 | 说明 |
|---|---|
| 分类侧边栏 | 可折叠为图标栏（64px），状态存 localStorage，移动端自动变为抽屉 |
| 首页 Hero | 标题 + 全站搜索 + 统计 + 「近期最火 AI 工具」榜单 |
| 工具卡片 | Logo / 名称 / 域名 / 简介 / 标签 / 定价标签 / 热门·新品角标 / 详情 + 访问 |
| 即时搜索 | 名称、简介、标签、分类、域名全文匹配，输入即筛选 |
| 定价筛选 | 全部 / 免费 / 免费增值 / 付费 / 开源 |
| 工具详情页 | `/tools/<slug>`，含相关推荐与 JSON-LD 结构化数据 |
| 分类页 | `/c/<slug>` |
| 深色模式 | 跟随系统或手动切换，持久化 |
| SEO | 每页独立 title/description/canonical/OG/Twitter Card、JSON-LD、`/sitemap.xml`、`/robots.txt` |
| 响应式 | 390px 起无横向溢出，移动端独立顶部栏 + 抽屉导航 |

### 管理后台
| 功能 | 说明 |
|---|---|
| Google 登录 | OAuth 2.0 授权码 + PKCE，邮箱白名单 + 管理员表双重校验 |
| 侧边栏折叠 | 按钮或 `Ctrl/Cmd + B` 折叠为图标栏，状态持久化 |
| 仪表盘 | 收录数 / 分类数 / 累计访问 / 管理员数，最近更新、访问排行、操作日志 |
| 访问统计 | 点击趋势、独立访客、国家/地区、来源页面、热门工具 Top12、零访问工具 |
| 工具管理 | 列表 + 关键词/分类/状态/排序筛选 + 分页 + 新增/编辑/删除 |
| 分类管理 | 增删改、图标选择、排序、显隐 |
| 批量导入 | CSV 上传或粘贴，按 `url` 或 `name` 去重（存在则更新） |
| 操作日志 | 记录谁在何时做了什么，可清空 |
| 管理员 | 查看白名单、启用/停用/删除管理员 |

> **访问统计是双写的**：每次点击同时写入 D1（实时、可查询）和 GA4（`select_tool` 事件），图表把两边的数据画在同一坐标系里方便对比。

---

## 技术栈

- **运行时**：Cloudflare Workers（ESM，`nodejs_compat`）
- **数据库**：Cloudflare D1（SQLite）
- **静态资源**：Cloudflare Workers Static Assets（`public/`）
- **前端**：服务端渲染 HTML + 原生 JS 渐进增强，**零框架、零构建**
- **样式**：手写 CSS 设计系统（CSS 变量 + `[data-theme="dark"]`）
- **图表**：ECharts（后台统计页，自托管）
- **鉴权**：WebCrypto HMAC-SHA256 签名 Cookie / RS256 JWT（无第三方库）

### 第三方静态资源

| 文件 | 版本 | 来源 | 用途 |
|---|---|---|---|
| `public/assets/echarts.min.js` | **5.5.1** | `https://fastly.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js` | 后台「访问统计」页的图表渲染 |

> - **自托管原因**：避免国内访问 `cdn.jsdelivr.net` / `unpkg` 不稳定导致图表空白。
> - **不影响 Worker 体积**：静态文件走 Assets 通道，不会打进 Worker 脚本包（实测 Worker 脚本 gzip 后约 56 KB）。
> - **升级方式**：
>   ```bash
>   # 1. 下载新版本（替换 5.5.2 为实际版本号）
>   curl -o public/assets/echarts.min.js \
>     https://fastly.jsdelivr.net/npm/echarts@5.5.2/dist/echarts.min.js
>   # 2. 验证：启动本地服务后访问 /admin/analytics，确认图表正常
>   # 3. 更新上表中的版本号
>   ```
> - ECharts 采用 Apache-2.0 许可证，版权归 Apache Software Foundation。

```
├── src/
│   ├── index.js              # Worker 入口与路由
│   ├── lib/
│   │   ├── auth.js           # Google OAuth + 会话 + 登录页兜底
│   │   ├── crypto.js         # HMAC 签名 / Cookie / 转义
│   │   ├── db.js             # D1 数据访问层 + 点击统计聚合
│   │   ├── ga.js             # GA4 Measurement Protocol 服务端镜像（双写）
│   │   ├── ga-report.js      # GA4 Data API 客户端（JWT + 缓存）
│   │   └── icons.js          # 内联 SVG 图标库
│   └── templates/
│       ├── public.js         # 前台页面
│       ├── admin.js          # 后台页面
│       └── analytics.js      # 访问统计页（ECharts option 生成）
├── public/                   # 静态资源（CSS / JS / 图标 / echarts）
├── db/
│   ├── schema.sql            # 表结构
│   └── seed.sql              # 13 分类 × 119 工具种子数据
└── wrangler.toml
```

---

## 部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
npx wrangler d1 create somarkit
```

把返回的 `database_id` 写入 `wrangler.toml` 的 `[[d1_databases]]` 段。

### 3. 初始化表结构与种子数据

```bash
npm run db:migrate   # 建表
npm run db:seed      # 写入 13 分类 + 119 工具
```

### 4. 创建 Google OAuth 客户端

1. 打开 [Google Cloud Console → 凭据](https://console.cloud.google.com/apis/credentials)
2. **创建凭据 → OAuth 客户端 ID → Web 应用**
3. **已获授权的重定向 URI** 填入（必须完全一致）：

   ```
   https://somarkit.com/admin/auth/callback
   ```

4. 记下 **客户端 ID** 与 **客户端密钥**

### 5. 配置密钥

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET        # 任意 32+ 位随机字符串
```

生成随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.1 配置 Google Analytics（可选）

访问统计支持 **D1 + GA4 双写**：点击事件同时写入自有数据库和 GA4，后台图表把两份数据画在一起对比。

**仅接入前端 gtag**（能看 PV/UV，但后台图表拿不到 GA 数据）：

```toml
# wrangler.toml
[vars]
GA_MEASUREMENT_ID = "G-XXXXXXXXXX"
```

**完整接入**（后台图表显示 GA 曲线）还需 3 步：

1. **启用 Google Analytics Data API**
   ```
   https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview
   ```

2. **创建服务账号并授权**
   - Google Cloud Console → IAM 与管理 → 服务账号 → 创建 → 密钥 → **JSON**
   - GA4 → 管理 → 媒体资源访问管理 → 添加该服务账号邮箱，角色 **查看者**

3. **写入 Worker 密钥**
   ```bash
   npx wrangler secret put GA_PROPERTY_ID      # 纯数字的属性 ID（非数据流 ID）
   npx wrangler secret put GA_SERVICE_ACCOUNT  # 整个 JSON 文件内容，单行
   ```

> ⚠️ **三个 ID 容易混淆**：
> | 名称 | 示例 | 用途 |
> |---|---|---|
> | 衡量 ID | `G-EMJ9M5XNX2` | 前端 gtag 注入 |
> | 数据流 ID | `16374545430` | GA 后台标识，**这里用不到** |
> | **属性 ID** | `565150853` | Data API 查询（填这个） |

> - 未配置 `GA_PROPERTY_ID` / `GA_SERVICE_ACCOUNT` 时，统计页只显示 D1 数据并提示"未配置"，不会报错。
> - GA 数据有 **1–2 天延迟**，所以曲线末尾会偏低，属正常现象。
> - GA Data API 结果在 Worker 内缓存 10 分钟，避免触发每日配额。

### 6. 设置管理员白名单

编辑 `wrangler.toml`：

```toml
[vars]
ADMIN_EMAILS = "you@gmail.com,teammate@gmail.com"
```

> 白名单里的邮箱**首次用 Google 登录**时会自动写入 `admins` 表并设为 `owner`。
> 之后的授权以 `admins` 表为准，可在后台「管理员」页停用或删除。

### 7. 绑定域名

`wrangler.toml` 已声明：

```toml
routes = [
  { pattern = "somarkit.com", custom_domain = true },
  { pattern = "www.somarkit.com", custom_domain = true },
]
```

> ⚠️ **绑定前必须清除冲突的 DNS 记录**，否则会报错
> `Hostname 'somarkit.com' already has externally managed DNS records`。
>
> 在 Cloudflare 面板 → `somarkit.com` → DNS 中删除：
> - `A` 记录 `somarkit.com`（原指向 216.198.79.1，已 404 的占位）
> - `CNAME` 记录 `www`（原指向已失效的 Vercel）
>
> 其它子域（`mail` / `data` 等）属于别的服务，**不要动**。

### 8. 部署

```bash
npm run deploy
```

首次访问 `https://somarkit.com/admin/login` → 「使用 Google 账号登录」。

---

## 本地开发

```bash
# 初始化本地库
npm run db:migrate:local
npm run db:seed:local

# 启动
npm run dev        # http://localhost:8799
```

本地登录不需要 Google：`.dev.vars` 中设置了 `DEV_LOGIN_EMAIL` 时，
访问 **`/admin/dev-login`** 会直接签发会话。

`.dev.vars`（已被 `.gitignore` 忽略）：

```
DEV_LOGIN_EMAIL=dev@local.test
SESSION_SECRET=local-dev-session-secret-do-not-use-in-prod
ADMIN_EMAILS=dev@local.test

# 可选：访问统计
GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_PROPERTY_ID=565150853
GA_SERVICE_ACCOUNT={"type":"service_account","project_id":"...", ...}
```

> - `DEV_LOGIN_EMAIL` **绝不能出现在生产环境**，该路由在生产不存在（未设置该变量即返回 404）。
> - `GA_SERVICE_ACCOUNT` 必须是**单行 JSON**（`wrangler dev` 不支持多行环境变量）。可用
>   `jq -c . key.json` 或 `node -e "console.log(JSON.stringify(require('./key.json')))"` 压成一行。
> - 修改 `.dev.vars` 后需要**重启 `wrangler dev`** 才会生效。

---

## 日常运维

### 新增工具
后台 → 工具管理 → **新增工具**，或用批量导入。

### 批量导入 CSV

模板表头：

```csv
name,url,category,tags,description,pricing,hot,new,featured
"Claude","https://claude.ai","AI 对话助手","对话,长文本","Anthropic 的 AI 助手","freemium",1,0,1
```

| 字段 | 说明 |
|---|---|
| `name` | 工具名称（必填） |
| `url` | 官网链接（必填，去重依据） |
| `category` | 分类名称或 slug，不存在的分类会留空 |
| `tags` | 逗号分隔（建议用引号包裹整个字段） |
| `description` | 简介 |
| `pricing` | `free` / `freemium` / `paid` / `opensource` |
| `hot` / `new` / `featured` | `1` 或 `0` |
| `logo` / `sort` | 可选 |

**去重规则**：`url` 或 `name` 命中已有记录则**更新**（保留原 slug，链接不失效），否则新增。

### 直接操作数据库

```bash
# 查看
npx wrangler d1 execute somarkit --remote --command="SELECT id,name,status FROM tools LIMIT 10"

# 备份导出
npx wrangler d1 export somarkit --remote --output=backup.sql
```

### 修改管理员

- 停用/删除：后台「管理员」页
- 新增白名单：改 `wrangler.toml` 的 `ADMIN_EMAILS` 后重新 `npm run deploy`

---

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/search?q=` | 公开搜索接口，返回 JSON |
| `POST` | `/api/track` | 上报工具点击。Body: `{"id": 12, "visitor": "abc123", "path": "/"}`。已发布校验 + 同 IP 60 秒去重 |
| `GET` | `/sitemap.xml` | 自动生成的站点地图 |
| `GET` | `/robots.txt` | 爬虫规则（屏蔽 `/admin`、`/api`） |

`/api/track` 的响应：`{"ok": true, "visitor": "..."}`，前端把 `visitor` 存进 `localStorage`，用于统计独立访客。

---

## 安全说明

| 项 | 措施 |
|---|---|
| OAuth CSRF | `state` 随机数 + HMAC 签名，10 分钟过期 |
| PKCE | S256 `code_verifier` / `code_challenge` |
| 会话 | HttpOnly + SameSite=Lax + 生产环境 Secure，HMAC-SHA256 签名，7 天过期 |
| 授权 | 邮箱白名单 **且** `admins` 表中 `active=1`；每次请求重新校验 |
| 邮箱验证 | 要求 Google `email_verified === true` |
| XSS | 所有输出经 `esc()` 转义 |
| 后台索引 | `/admin` 全部返回 `noindex, nofollow` |
| 审计 | 登录、增删改、导入全部写入 `audit_log` |

---

## 数据表

| 表 | 用途 |
|---|---|
| `categories` | 分类（slug / 名称 / 图标 / 排序 / 显隐） |
| `tools` | 工具（slug / 名称 / URL / 简介 / 分类 / 标签 / 定价 / 角标 / 状态 / `visit_count` 缓存） |
| `admins` | 管理员（email / 角色 / 启用状态 / 最近登录） |
| `audit_log` | 操作日志 |
| `submissions` | 访客提交的工具推荐（审核后转正） |
| `click_events` | **点击明细（访问统计的数据源）** |

`tools.status`：`published`（前台可见）/ `draft`（草稿，前台不可见）/ `archived`（归档，前台不可见）。

### 关于 `click_events` 与 `tools.visit_count`

- `click_events` 是**唯一事实来源**：每次点击一行，记录 `tool_id` / `ip_hash`（加盐哈希，不存原始 IP）/ `visitor` / `country` / `referer` / `path` / `created_at`。
- `tools.visit_count` 只是**缓存**，与明细在同一批 `batch` 中更新，用于前台热榜排序，避免每次都做聚合。
- 二者若因手工改库而不一致，可用下面的 SQL 重建：

```sql
UPDATE tools SET visit_count = (
  SELECT COUNT(*) FROM click_events e WHERE e.tool_id = tools.id
);
```
