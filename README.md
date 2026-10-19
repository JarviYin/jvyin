# jvyin.com

个人网站 + Newsletter，基于 AWS 全 Serverless（方案二）。

- **网站**：Astro 静态站，托管在 S3 + CloudFront，DNS 走 Route 53
- **Newsletter**：SES 发信 + DynamoDB 存订阅 + Lambda/API Gateway 处理订阅、双重确认、一键退订
- **送达率保护**：SES 退信/投诉 → SNS → Lambda 自动标记，群发自动带 `List-Unsubscribe` 头
- 月成本约 $0.5 以内

## 目录结构

```
src/
  site.config.ts        # 站点全局配置（名字/简介/链接/文案，改这里即可）
  content/newsletters/  # 静态 Newsletter 源文件（Markdown）
  pages/                # 页面（admin=管理后台；newsletter=静态期刊；nl-issue=动态回退壳）
lambda/                 # Newsletter 后端（订阅/确认/退订、管理后台 API、退信处理）
shared/                 # 邮件模板（Lambda 与 CLI 共用）
infra/                  # CloudFormation（后端栈 + 站点栈）
scripts/                # 部署与发刊脚本
```

## 日常使用

### Newsletter 管理后台（推荐）

打开 **https://jvyin.com/admin/**，输入管理密码登录：

- **新建一期**：填期号/标题/邮件主题/摘要/正文（Markdown）
- **保存草稿**：不发布，随时继续编辑
- **试运行**：标记发布但不发信（存档页可见）
- **发布并发送**：一键发送给所有已确认订阅者（自动排除退订/退信），并更新存档

管理密码存在 AWS SSM（`/jvyin/admin/password`），修改：

```bash
aws ssm put-parameter --name /jvyin/admin/password --type SecureString --value "新密码" --overwrite --region us-east-1
```

### 命令行（备用）

```bash
pnpm dev                                    # 本地开发（astro dev --background / stop / status / logs）
pnpm build                                  # 构建

bash scripts/deploy-site.sh                 # 构建 + 部署网站（含基础设施）
bash scripts/deploy-backend.sh              # 部署 Newsletter 后端（改 Lambda 后）
node scripts/send-newsletter.mjs 002 --dry-run   # 发刊试运行（读本地 md）
node scripts/send-newsletter.mjs 002             # 正式发刊（读本地 md）
```

### Newsletter 存档与发刊

- `/newsletter/001/` 至 `/newsletter/009/` 是构建时生成的静态存档，使用当前共享阅读、分享和 SEO 元数据。
- 其他数字期号由 `/nl-issue/` 动态壳回退到 Newsletter API；管理后台可以继续创建、发布和群发，但动态页不含静态页的独立分享元数据。
- 新增或更新需要静态分享页的期号时，先更新 `src/content/newsletters/<NNN>.md` 和所需图片，再更新 `infra/site.yaml` 的 `staticIssues` 路由白名单，最后重新构建并部署网站。这样 RSS、页面正文和分享元数据会一起更新。
- `node scripts/publish-issue-site.mjs <NNN>` 只写入 DynamoDB 的动态存档，不会更新静态页面；`send-newsletter.mjs` 负责邮件发送，使用相同的 Markdown 内容。

## 订阅者管理

```bash
# 查看全部订阅者与状态（confirmed/pending/unsubscribed/bounced）
aws dynamodb scan --table-name jvyin-subscribers --region us-east-1 --query 'Items[].{email:email.S,status:status.S}' --output table

# 手动删除某个订阅者
aws dynamodb delete-item --table-name jvyin-subscribers --region us-east-1 --key '{"email":{"S":"someone@example.com"}}'

# 验证某邮箱的订阅流程（真实邮箱测试）
bash scripts/verify-subscriber.sh subscribe   you@example.com
bash scripts/verify-subscriber.sh status      you@example.com
bash scripts/verify-subscriber.sh unsubscribe you@example.com
bash scripts/verify-subscriber.sh cleanup     you@example.com
```

## 订阅流程

1. 表单提交 → `POST /api/subscribe`（存 pending + 发确认邮件）
2. 点击确认链接 → `GET /api/confirm?token=`（转 confirmed + 加入 SES 联系人列表 + 欢迎邮件）
3. 每封邮件底部 / `List-Unsubscribe` 头 → `/unsubscribe` 页 → `POST /api/unsubscribe`
4. SES 退信/投诉 → SNS → Lambda 标记 bounced/unsubscribed，群发时自动排除

## 生产访问（一次性操作）

SES 新账号处于沙盒（只能发给已验证地址）。上线前需要：

1. 打开 AWS 控制台 [SES 账号页](https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/account)
2. 点击 **Request production access**，理由填：个人 newsletter，双重确认订阅，发往确认过的订阅者
3. 通常 24 小时内获批

获批前可用测试邮箱验证全流程（先把测试邮箱加入验证列表）：
`aws sesv2 create-email-identity --email-identity you@example.com`

## 上线前清单

- [ ] 检查 `src/site.config.ts` 的名字、tagline、简介、Email、社交链接
- [ ] 确认新增静态期号已同步 Markdown、图片和 `staticIssues` 路由白名单
- [ ] 提交 SES 生产访问申请（见上）
- [ ] 发刊前先运行 `node scripts/send-newsletter.mjs <NNN> --dry-run`
- [ ] 可选：把仓库推送到 GitHub，接入 GitHub Actions 自动部署
- [ ] 可选：国内访问加速（域名 DNS 切 Cloudflare 或加其 CDN）
# AI agents observatory

The `/agents/` page combines a curated product registry (`src/data/ai-agents.ts`), the existing on-chain ecosystem, and dated first-party news/repository snapshots. Product capabilities and manual selections retain their review dates. Repository stars indicate repository attention, not users or agent performance.

Refresh public sources locally, then rebuild:

```sh
python3 scripts/refresh-ai-agents.py
npm run build
```

The collector uses no credentials or paid APIs. Each source has an independent status and observation timestamp; failed requests retain previous valid observations, or remain unavailable. There is no scheduler or automatic deployment configured. Manual product/news review remains necessary for unsupported sources.
