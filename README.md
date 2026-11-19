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
| 工具管理 | 列表 + 关键词/分类/状态筛选 + 分页 + 新增/编辑/删除 |
| 分类管理 | 增删改、图标选择、排序、显隐 |
| 批量导入 | CSV 上传或粘贴，按 `url` 或 `name` 去重（存在则更新） |
| 操作日志 | 记录谁在何时做了什么，可清空 |
| 管理员 | 查看白名单、启用/停用/删除管理员 |
| 访问统计 | 前台点击「访问」按钮通过 `sendBeacon` 上报，驱动热门排序 |

---

## 技术栈

- **运行时**：Cloudflare Workers（ESM，`nodejs_compat`）
- **数据库**：Cloudflare D1（SQLite）
- **静态资源**：Cloudflare Workers Static Assets（`public/`）
- **前端**：服务端渲染 HTML + 原生 JS 渐进增强，**零框架、零构建**
- **样式**：手写 CSS 设计系统（CSS 变量 + `[data-theme="dark"]`）
- **鉴权**：WebCrypto HMAC-SHA256 签名 Cookie（无第三方库）

```
├── src/
│   ├── index.js              # Worker 入口与路由
│   ├── lib/
│   │   ├── auth.js           # Google OAuth + 会话 + 登录页兜底
│   │   ├── crypto.js         # HMAC 签名 / Cookie / 转义
│   │   ├── db.js             # D1 数据访问层
│   │   └── icons.js          # 内联 SVG 图标库
│   └── templates/
│       ├── public.js         # 前台页面
│       └── admin.js          # 后台页面
├── public/                   # 静态资源（CSS / JS / 图标）
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
```

> `DEV_LOGIN_EMAIL` **绝不能出现在生产环境**，该路由在生产不存在（未设置该变量即返回 404）。

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
| `POST` | `/api/track` | 上报工具点击（`{"id": 12}`） |
| `GET` | `/sitemap.xml` | 自动生成的站点地图 |
| `GET` | `/robots.txt` | 爬虫规则（屏蔽 `/admin`、`/api`） |

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
| `tools` | 工具（slug / 名称 / URL / 简介 / 分类 / 标签 / 定价 / 角标 / 状态 / 访问数） |
| `admins` | 管理员（email / 角色 / 启用状态 / 最近登录） |
| `audit_log` | 操作日志 |
| `settings` | 预留键值配置 |

`tools.status`：`published`（前台可见）/ `draft`（草稿，前台不可见）/ `archived`（归档，前台不可见）。
