# jvyin.com 项目上下文（供新 session 接续）

> 更新时间：2026-08-18。新 session 请先读本文件，再读 `README.md`。

## 一、项目是什么

个人网站 + Newsletter，全 AWS Serverless，成本约 $0.5/月。

- **网站**：https://jvyin.com —— Astro 7 静态站（极简黑白、中文、自动暗色模式）
- **Newsletter**：**AI 交易/增长周报**，每周五一封，EP01 起（范冰「增长黑客AI周报」模式）
- **定位**：AI × Web3 增长 × 投资交易（用户 = Jarvi Yin / jvyin，公众号「家伟同学」）
- **写稿基调**：幽默、松弛、抽象。认真讲事，不正经说话。见 `newsletter-style-guide.md`
- **管理后台**：https://jvyin.com/admin/ （密码见下文「密钥」）

## 二、当前生产状态（均为实测结论）

- SES **生产访问已批准**（ProductionAccessEnabled: true，日限额 50,000），域名 jvyin.com 已验证（DKIM/SPF/DMARC SUCCESS）
- 订阅者在 DynamoDB 表 `jvyin-subscribers`，不把真实邮箱写进仓库
- 期数（表 `jvyin-issues`）：**001 = EP01 策划稿（draft，已按基调写好，待用户填交易复盘后周五发布）**；002/003 是历史测试垃圾（draft，勿用，可删）
- 邮件模板 `jvyin-newsletter`（SES v2）、Contact List `jvyin-newsletter`、SNS 退信主题 `jvyin-newsletter-bounce`
- 头像：微信头像 → 线条风矢量（`public/avatar.svg` 默认 v2-med；备选在 `assets/avatar/`；favicon 为剪影 `public/favicon.png`）。用户尚未确认是否满意/换版本
- Substack：**用户还没建 publication**。方案已定：网站为主站，后台「复制全文 HTML（Substack）」按钮 → 粘贴镜像发布

## 三、架构

```
访客 → CloudFront (jvyin.com + www) ─┬─ 默认行为 → S3 静态站 (bucket: jvyin.com)
                                     └─ /api/* 行为 → API Gateway HTTP API → Lambda jvyin-newsletter-api
Lambda 依赖：DynamoDB (jvyin-subscribers, jvyin-issues) + SES v2 + SSM
退信/投诉：SES → SNS → Lambda jvyin-newsletter-events → 标记 DynamoDB
CloudFront Function（jvyin-www-redirect）：www→裸域 301；/newsletter/<期号>/ → /nl-issue/index.html（动态期数页壳）；无扩展名路径补 index.html
```

关键标识（region 一律 **us-east-1**）：

- CloudFormation 栈：`jvyin-site`（S3/CloudFront/证书/R53/函数）、`jvyin-newsletter`（DynamoDB/Lambda/HTTP API/SNS）
- 账号、Route 53 托管区、API Gateway 地址和证书 ARN 留在本机与 AWS 控制台，不写进仓库
- S3：`jvyin.com`（站点）、`jvyin-artifacts`（Lambda zip）

## 四、密钥（勿提交明文）

- 后台密码：AWS SSM `/jvyin/admin/password`（SecureString）；本地备份 `.admin-password`（gitignored）。修改：`aws ssm put-parameter --name /jvyin/admin/password --type SecureString --value "新密码" --overwrite --region us-east-1`
- HMAC secret：SSM `/jvyin/admin/secret`（Lambda 运行时读取，env 注入仅本地测试用）
- AWS 凭据：本机已配置（用户 hypercoco-dev）

## 五、日常操作手册

**发一期周报（主流程，用户自己点）**：
1. jvyin.com/admin → 登录 → 编辑 001 → 填交易复盘 → 「发布并发送」（会自动先保存）
2. 点「复制全文 HTML（Substack）」→ 粘贴到 Substack
3. 存档链接（jvyin.com/newsletter/001/）同步到 X（@jvyincom）+ 公众号

**命令**：
```bash
pnpm dev                                  # 本地（用 astro dev --background / stop / status / logs）
bash scripts/deploy-site.sh               # 构建+部署网站（含 CFN 基础设施更新）
bash scripts/deploy-backend.sh            # 打包 Lambda + 部署后端栈
node scripts/send-newsletter.mjs 001 --dry-run   # CLI 发刊（读 src/content/newsletters/*.md，与后台共用邮件模板）
node scripts/send-newsletter.mjs 001
bash scripts/verify-subscriber.sh <cmd> <email>   # subscribe/status/unsubscribe/cleanup
aws sesv2 get-account --region us-east-1 --query ProductionAccessEnabled
```

**订阅流程**：表单 → POST /api/subscribe（pending+确认邮件）→ 点链接 GET /api/confirm?token=（302 → /confirm?ok=1 + 欢迎邮件 + 入 Contact List）→ 一键退订 GET /api/unsubscribe?email=&confirm=1（302 → /unsubscribe?done=1）。退信/投诉自动标记并排除发送。

**后台 API**：POST /api/admin/login；GET /api/admin/issues；PUT /api/admin/issues/{id}；POST /api/admin/issues/{id}/publish（?dryrun=1 试运行）；GET /api/admin/subscribers；公开 GET /api/newsletters、GET /api/newsletters/{id}。

## 六、关键文件

```
src/site.config.ts          # 全站文案/链接/Newsletter 配置（改这里）
src/pages/admin.astro       # 管理后台
src/pages/nl-issue/index.astro  # 期数渲染壳（CloudFront 改写目标）
src/pages/newsletter/index.astro # 存档列表（API 动态渲染）
src/content/posts/          # 博客文章（md，content collection）
src/components/SubscribeForm.astro # 订阅表单（JS fetch + 无 JS 原生 POST 兜底）
shared/email-layout.mjs     # 邮件模板+EP 编号+articleHtml（Lambda 与 CLI 共用）
lambda/api.mjs              # 全部后端逻辑（订阅/后台/公开 API）
lambda/events.mjs           # 退信/投诉处理
infra/newsletter.yaml       # 后端栈
infra/site.yaml             # 站点栈（CloudFront 函数在此）
scripts/                    # 部署/发刊/验证脚本
newsletter-style-guide.md   # 写稿基调（幽默松弛抽象）
newsletter-template.md      # 每期模板（栏目结构）
docs/session-context.md     # 本文件
.archive/                   # 旧示例文章/期数归档
assets/avatar/              # 头像生成产物（bin/ 中间件、3 个 SVG 变体）
public/avatar-preview/      # 头像变体预览 PNG（线上可见）
```

## 七、待办 / 遗留

1. **本周五（2026-08-21）发 EP01**：用户填交易复盘四问 → 后台发布
2. 用户建 Substack publication（尚未建；建好后可绑定自定义域名、导入订阅者 CSV）
3. 头像效果等用户反馈（v1-fine / v2-med 当前 / v3-bold / v4-silhouette）
4. `src/pages/about.astro` 与《我的交易系统》文章占位待用户填真实内容
5. 未确认的订阅等用户点击确认邮件（或过期自动清）
6. 后台没有删除期数功能（有需要可加）
7. 周报首期发布后观察 QQ/Gmail 送达位置；Gmail 确认邮件此前进过收件箱

## 八、坑与教训（避免重踩）

- macOS 自带 bash 3.2：变量名后紧跟全角字符（如 `$STACK（`）会被吞进变量名 → 用 `${VAR}` 或加空格
- Astro 忽略 `_` 前缀的 pages 目录（`_issue` 曾不构建）→ 动态壳用了 `/nl-issue/`
- CloudFront：无尾斜杠目录（/confirm?ok=1）需要 CF 函数补 index.html；API 返回 404 会被全局 CustomErrorResponse 替换成 /404.html（后台接口避免用 404 表示业务失败）
- API Gateway HTTP API：form-urlencoded 请求体到达 Lambda 时是 base64（`isBase64Encoded`），需解码
- DynamoDB `token`/`status` 是保留字，表达式里要 `#` 别名
- SES SendBulkEmail 用模板需 `ses:SendBulkTemplatedEmail` 权限；响应字段是 `BulkEmailEntryResults`
- Lambda 环境变量不支持 SSM SecureString 动态引用 → 运行时 GetParameter
- vtracer 在 macOS Python 3.14 上段错误 → 头像矢量化用自写骨架走线器（`/tmp/imgvenv` 有 pillow/numpy）
- pnpm 全局 store v10/v11 切换导致过 node_modules 损坏 → 修法：`CI=true pnpm install --no-frozen-lockfile`
- 静态站页面读不了运行时 query 参数 → /confirm、/unsubscribe 的状态显示靠客户端 JS 读 `location.search`
