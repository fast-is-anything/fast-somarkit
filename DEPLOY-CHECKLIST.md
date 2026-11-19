# 上线检查清单

> 记录 somarkit.com 的部署结果与剩余人工步骤。

## ✅ 已完成（自动化）

| 项 | 状态 |
|---|---|
| Cloudflare Worker `somarkit` | 已部署 |
| D1 数据库 `somarkit` | 已创建并初始化 |
| 表结构（categories / tools / admins / audit_log / settings） | 已建 |
| 种子数据 | 13 分类 / 119 工具，全部 published |
| 自定义域名绑定 | `somarkit.com` + `www.somarkit.com` 均为 custom domain |
| DNS 冲突清理 | 已删除原 404 占位 A 记录与失效 Vercel CNAME |
| `GOOGLE_CLIENT_ID` | 已写入 Worker 密钥 |
| `GOOGLE_CLIENT_SECRET` | 已写入 Worker 密钥 |
| `SESSION_SECRET` | 已生成 64 位十六进制并写入 |
| `ADMIN_EMAILS` | `eastlion123456@gmail.com` |
| 前台路由 | 全部 200（含 404 页） |
| API `/api/search` | 正常返回 JSON |
| `/sitemap.xml`、`/robots.txt` | 正常 |
| OAuth 跳转 | 已验证：redirect_uri / PKCE S256 / state 签名 Cookie 全部正确 |

## ⏳ 需要你完成 / 确认

### 1. 在 Google Cloud Console 登记回调地址

OAuth 客户端必须包含**完全一致**的重定向 URI，否则登录会报 `redirect_uri_mismatch`：

```
https://somarkit.com/admin/auth/callback
```

路径：Google Cloud Console → API 和服务 → 凭据 → 你的 OAuth 客户端 → **已获授权的重定向 URI**

如需本地调试，可另加一条：

```
http://localhost:8799/admin/auth/callback
```

### 2. 首次登录（会自动创建 owner 账号）

1. 打开 <https://somarkit.com/admin/login>
2. 点「使用 Google 账号登录」
3. 用 **eastlion123456@gmail.com** 登录

该邮箱在 `ADMIN_EMAILS` 白名单内，首次登录会自动写入 `admins` 表并设为 `owner`。
之后可在此基础上添加其他管理员。

### 3. 验收后台

登录后依次检查：

- [ ] 仪表盘数字正确（119 工具 / 13 分类）
- [ ] **侧边栏折叠**：点左上角按钮，或按 `Ctrl + B`
- [ ] 工具管理：搜索、筛选、分页、编辑、删除
- [ ] 新增工具 → 前台立即可见
- [ ] 分类管理：改图标/排序/显隐
- [ ] 批量导入：粘贴 CSV 试跑一次
- [ ] 操作日志：能看到刚才的动作

## ⚠️ 注意事项

| 项 | 说明 |
|---|---|
| **不要停用当前账号** | 后台已做保护：不能停用/删除自己 |
| `DEV_LOGIN_EMAIL` | 生产环境**未设置**，`/admin/dev-login` 在生产不存在（404） |
| 其它子域 | `mail`、`data` 等属于别的服务，本次**未触碰** |
| 缓存 | 首页 `s-maxage=300`，改动后最多 5 分钟生效；工具页/后台不缓存 |
| 管理员增删 | 停用/删除走后台；新增白名单需改 `wrangler.toml` 后重新 deploy |

## 常用运维命令

```bash
# 重新部署
npm run deploy

# 查看线上数据
npx wrangler d1 execute somarkit --remote --command="SELECT id,name FROM tools ORDER BY id DESC LIMIT 5"

# 备份
npx wrangler d1 export somarkit --remote --output=backup-$(date +%F).sql

# 实时日志
npx wrangler tail somarkit

# 改管理员白名单后
npx wrangler deploy
```
