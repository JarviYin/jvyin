/**
 * Newsletter API —— 订阅/确认/退订 + 管理后台（期数 CRUD、发布发送）+ 公开存档读取
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  SESv2Client,
  SendEmailCommand,
  CreateContactCommand,
  CreateEmailTemplateCommand,
  UpdateEmailTemplateCommand,
  SendBulkEmailCommand,
} from '@aws-sdk/client-sesv2';
import { randomUUID, createHmac } from 'node:crypto';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { renderIssueEmail, renderBodyHtml, epLabel } from '../shared/email-layout.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});

const {
  TABLE = 'jvyin-subscribers',
  ISSUES_TABLE = 'jvyin-issues',
  FROM = 'jvyin <newsletter@jvyin.com>',
  REPLY_TO = 'jmyjw119@gmail.com',
  SITE_URL = 'https://jvyin.com',
  ARCHIVE_URL = 'https://jvyin.com/newsletter/',
  CONTACT_LIST = 'jvyin-newsletter',
  EMAIL_TEMPLATE = 'jvyin-newsletter',
} = process.env;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

/** 服务端重定向：不依赖页面 JS，浏览器直接跟随 */
const redirect = (location) => ({
  statusCode: 302,
  headers: { location },
});

const norm = (s) => String(s ?? '').trim().toLowerCase();

/* ---------- 管理后台认证（HMAC token，24h 有效） ---------- */
/* 密钥从 SSM 读取（Lambda 环境变量不支持 SSM 安全引用）；本地测试可用环境变量注入 */
let cachedAdmin = null;
async function loadAdminSecrets() {
  if (cachedAdmin) return cachedAdmin;
  if (process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET) {
    cachedAdmin = { password: process.env.ADMIN_PASSWORD, secret: process.env.ADMIN_SECRET };
    return cachedAdmin;
  }
  const ssm = new SSMClient({});
  const [p, s] = await Promise.all([
    ssm.send(new GetParameterCommand({ Name: '/jvyin/admin/password', WithDecryption: true })),
    ssm.send(new GetParameterCommand({ Name: '/jvyin/admin/secret', WithDecryption: true })),
  ]);
  cachedAdmin = { password: p.Parameter?.Value ?? '', secret: s.Parameter?.Value ?? '' };
  return cachedAdmin;
}

const signToken = (payload, secret) => {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
};

const verifyToken = (token, secret) => {
  try {
    const [data, sig] = String(token ?? '').split('.');
    const expect = createHmac('sha256', secret).update(data).digest('base64url');
    if (sig !== expect) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const requireAuth = async (event) => {
  const { secret } = await loadAdminSecrets();
  const token = String(event.headers?.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || !verifyToken(token, secret)) {
    return json(401, { ok: false, message: '未登录或登录已过期' });
  }
  return null;
};

export const handler = async (event) => {
  const path = event.rawPath ?? event.path ?? '';
  const method = (event.requestContext?.http?.method ?? event.httpMethod ?? '').toUpperCase();
  console.log(JSON.stringify({ method, path, ip: event.requestContext?.http?.sourceIp }));

  try {
    if (path === '/api/subscribe' && method === 'POST') return await subscribe(event);
    if (path === '/api/confirm' && method === 'GET') return await confirm(event);
    if (path === '/api/unsubscribe' && (method === 'POST' || method === 'GET')) return await unsubscribe(event);

    // ---- 管理后台 ----
    if (path === '/api/admin/login' && method === 'POST') return await adminLogin(event);
    if (path === '/api/admin/issues' && method === 'GET') return await adminListIssues(event);
    if (path === '/api/admin/subscribers' && method === 'GET') return await adminSubscribers(event);
    const adminIssue = path.match(/^\/api\/admin\/issues\/([^/]+)$/);
    if (adminIssue && method === 'PUT') return await adminSaveIssue(event);
    const adminPublish = path.match(/^\/api\/admin\/issues\/([^/]+)\/publish$/);
    if (adminPublish && method === 'POST') return await adminPublishIssue(event);

    // ---- 公开存档 ----
    if (path === '/api/newsletters' && method === 'GET') return await publicListIssues();
    const pubIssue = path.match(/^\/api\/newsletters\/([^/]+)$/);
    if (pubIssue && method === 'GET') return await publicGetIssue(event);

    return json(404, { ok: false, message: 'not found' });
  } catch (err) {
    console.error(err);
    return json(500, { ok: false, message: '服务器错误，请稍后重试' });
  }
};

async function subscribe(event) {
  // 支持两种提交方式：
  // 1) JSON（页面 JS fetch）
  // 2) 表单编码（原生 <form method="POST">，无 JS 兜底路径 → 处理后 302 到结果页）
  const contentType = String(event.headers?.['content-type'] ?? '');
  const isForm = contentType.includes('application/x-www-form-urlencoded');
  let body;
  if (isForm) {
    // API Gateway 对表单编码的 body 会做 base64 编码，需要先解码
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
      : String(event.body ?? '');
    const params = new URLSearchParams(rawBody);
    body = {
      email: params.get('email'),
      homepage: params.get('hp_x7q2'),
      source: 'form',
    };
  } else {
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return json(400, { ok: false, message: '请求格式错误' });
    }
  }

  const email = norm(body.email);
  if (!EMAIL_RE.test(email)) {
    return isForm
      ? redirect(`${SITE_URL}/confirm?sub=err&reason=invalid`)
      : json(400, { ok: false, message: '邮箱格式不正确' });
  }
  // 蜜罐字段：真实用户不会填写（表单里不可见）
  if (body.homepage || body.website) {
    return isForm
      ? redirect(`${SITE_URL}/confirm?sub=ok`)
      : json(200, { ok: true, message: '订阅成功！请查收确认邮件。' });
  }

  const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  const rec = existing.Item;

  if (rec?.status === 'confirmed') {
    return isForm
      ? redirect(`${SITE_URL}/confirm?sub=ok`)
      : json(200, { ok: true, message: '这个邮箱已经订阅过了 🙂' });
  }
  // 已退订的邮箱允许重新订阅；pending 的邮箱重发一封新确认邮件

  const token = randomUUID();
  const now = Date.now();
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      email,
      status: 'pending',
      token,
      createdAt: new Date(now).toISOString(),
      expiresAt: Math.floor(now / 1000) + 24 * 3600, // 24h 未确认自动清除
      source: body.source ?? 'web',
      confirmedAt: null,
    },
  }));

  // 确认链接直接指向 API：服务端完成确认后 302 跳转到结果页（不依赖页面 JS）
  const confirmLink = `${SITE_URL}/api/confirm?token=${token}`;
  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: FROM,
      ReplyToAddresses: [REPLY_TO],
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: '请确认订阅 jvyin 的 newsletter', Charset: 'utf-8' },
          Body: {
            Html: {
              Charset: 'utf-8',
              Data: [
                '<div style="max-width:560px;margin:0 auto;font-family:-apple-system,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;color:#161616;line-height:1.7">',
                '<p>你好，</p>',
                '<p>我们收到了你的订阅请求。点击下面的按钮完成确认（链接 24 小时内有效）：</p>',
                `<p style="margin:24px 0"><a href="${confirmLink}" style="background:#161616;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none">确认订阅</a></p>`,
                '<p style="color:#666;font-size:13px">或复制此链接到浏览器：<br>',
                `<a href="${confirmLink}">${confirmLink}</a></p>`,
                '<p style="color:#666;font-size:13px">如果不是你本人的操作，忽略这封邮件即可。</p>',
                '<p style="margin-top:28px">— jvyin</p>',
                '</div>',
              ].join('\n'),
            },
            Text: {
              Charset: 'utf-8',
              Data: `你好，\n\n我们收到了你的订阅请求。打开下面的链接完成确认（24 小时内有效）：\n${confirmLink}\n\n如果不是你本人的操作，忽略这封邮件即可。\n\n— jvyin`,
            },
          },
        },
      },
    }));
  } catch (err) {
    // 沙盒/未验证收件人等可预期的发送失败：给出明确、可操作的提示
    console.warn('确认邮件发送失败:', err?.name, err?.message);
    if (err?.name === 'MessageRejected') {
      return isForm
        ? redirect(`${SITE_URL}/confirm?sub=err&reason=sandbox`)
        : json(200, {
            ok: false,
            message: '订阅暂时无法完成：邮件系统正在开通审核中（AWS 审批，通常 24 小时内）。审核通过后请重新订阅一次。',
          });
    }
    return isForm
      ? redirect(`${SITE_URL}/confirm?sub=err&reason=send`)
      : json(200, { ok: false, message: '确认邮件发送失败，请稍后再试。' });
  }

  return isForm
    ? redirect(`${SITE_URL}/confirm?sub=ok`)
    : json(200, { ok: true, message: '订阅成功！请查收确认邮件，点击邮件里的链接完成订阅。' });
}

async function confirm(event) {
  const token = String(event.queryStringParameters?.token ?? '');
  if (!token) return redirect(`${SITE_URL}/confirm?err=invalid`);

  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'token-index',
    KeyConditionExpression: '#t = :t',
    ExpressionAttributeNames: { '#t': 'token' },
    ExpressionAttributeValues: { ':t': token },
  }));
  const rec = res.Items?.[0];
  if (!rec) return redirect(`${SITE_URL}/confirm?err=invalid`);
  const email = rec.email;

  if (rec.status !== 'pending') {
    return redirect(`${SITE_URL}/confirm?ok=1`);
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { email },
    UpdateExpression: 'SET #s = :s, confirmedAt = :c REMOVE #t, expiresAt',
    ExpressionAttributeNames: { '#s': 'status', '#t': 'token' },
    ExpressionAttributeValues: { ':s': 'confirmed', ':c': new Date().toISOString() },
  }));

  // 加入 SES 联系人列表（后续群发自动带 List-Unsubscribe 头）
  try {
    await ses.send(new CreateContactCommand({ ContactListName: CONTACT_LIST, EmailAddress: email }));
  } catch (err) {
    console.warn('CreateContact failed:', err?.message);
  }

  // 欢迎邮件
  await ses.send(new SendEmailCommand({
    FromEmailAddress: FROM,
    ReplyToAddresses: [REPLY_TO],
    Destination: { ToAddresses: [email] },
    Content: {
      Simple: {
        Subject: { Data: '订阅成功 ✅ 欢迎加入', Charset: 'utf-8' },
        Body: {
          Html: {
            Charset: 'utf-8',
            Data: [
              '<div style="max-width:560px;margin:0 auto;font-family:-apple-system,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;color:#161616;line-height:1.7">',
              '<p>你好，</p>',
              '<p>订阅成功！以后每期 newsletter 都会直接发到你的邮箱。</p>',
              `<p style="margin:24px 0"><a href="${ARCHIVE_URL}" style="background:#161616;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none">查看往期存档</a></p>`,
              '<p style="color:#666;font-size:13px">每封邮件底部都有一键退订链接，随时可以离开。</p>',
              '<p style="margin-top:28px">— jvyin</p>',
              '</div>',
            ].join('\n'),
          },
          Text: {
            Charset: 'utf-8',
            Data: `你好，\n\n订阅成功！以后每期 newsletter 都会直接发到你的邮箱。\n往期存档：${ARCHIVE_URL}\n\n每封邮件底部都有一键退订链接，随时可以离开。\n\n— jvyin`,
          },
        },
      },
    },
  }));

  return redirect(`${SITE_URL}/confirm?ok=1`);
}

async function unsubscribe(event) {
  const method = (event.requestContext?.http?.method ?? event.httpMethod ?? '').toUpperCase();
  let email;

  if (method === 'GET') {
    // 邮件里的一键退订链接：服务端处理后 302 到结果页（不依赖页面 JS）
    email = norm(event.queryStringParameters?.email ?? '');
    if (!EMAIL_RE.test(email)) return redirect(`${SITE_URL}/unsubscribe?err=1`);
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { email },
      UpdateExpression: 'SET #s = :s, unsubscribedAt = :u REMOVE #t',
      ExpressionAttributeNames: { '#s': 'status', '#t': 'token' },
      ExpressionAttributeValues: { ':s': 'unsubscribed', ':u': new Date().toISOString() },
    }));
    return redirect(`${SITE_URL}/unsubscribe?done=1`);
  }

  // 页面表单（POST JSON）
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, message: '请求格式错误' });
  }

  email = norm(body.email);
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, message: '邮箱格式不正确' });

  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { email },
    UpdateExpression: 'SET #s = :s, unsubscribedAt = :u REMOVE #t',
    ExpressionAttributeNames: { '#s': 'status', '#t': 'token' },
    ExpressionAttributeValues: { ':s': 'unsubscribed', ':u': new Date().toISOString() },
  }));

  return json(200, { ok: true, message: '已退订。祝你一切顺利 👋' });
}

/* ================= 管理后台 ================= */

async function adminLogin(event) {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, message: '请求格式错误' });
  }
  const { password, secret } = await loadAdminSecrets();
  if (!password || String(body.password ?? '') !== password) {
    return json(401, { ok: false, message: '密码错误' });
  }
  return json(200, { ok: true, token: signToken({ exp: Date.now() + 24 * 3600 * 1000 }, secret) });
}

async function adminListIssues(event) {
  const denied = await requireAuth(event);
  if (denied) return denied;
  const res = await ddb.send(new ScanCommand({ TableName: ISSUES_TABLE }));
  const issues = (res.Items ?? [])
    .map(({ html, text, ...rest }) => rest)
    .sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
  return json(200, { ok: true, issues });
}

async function adminSaveIssue(event) {
  const denied = await requireAuth(event);
  if (denied) return denied;
  const id = String(event.pathParameters?.id ?? '').trim();
  if (!/^\d{1,4}$/.test(id)) return json(400, { ok: false, message: '期号需为 1-4 位数字' });
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { ok: false, message: '请求格式错误' });
  }
  const existing = await ddb.send(new GetCommand({ TableName: ISSUES_TABLE, Key: { id } }));
  const prev = existing.Item ?? {};
  const bodyText = String(body.body ?? prev.body ?? '').trim();
  const item = {
    id,
    title: String(body.title ?? prev.title ?? '').trim(),
    subject: String(body.subject ?? prev.subject ?? '').trim(),
    description: String(body.description ?? prev.description ?? '').trim(),
    body: bodyText,
    status: prev.status === 'published' ? 'published' : 'draft',
    pubDate: prev.pubDate ?? null,
    html: prev.html ?? null,
    text: prev.text ?? null,
    articleHtml: bodyText ? renderBodyHtml(bodyText) : prev.articleHtml ?? null,
    updatedAt: new Date().toISOString(),
  };
  if (!item.title || !item.subject || !item.body) {
    return json(400, { ok: false, message: '标题、主题、正文不能为空' });
  }
  await ddb.send(new PutCommand({ TableName: ISSUES_TABLE, Item: item }));
  return json(200, { ok: true, message: `${epLabel(id)} 已保存为${item.status === 'published' ? '已发布' : '草稿'}` });
}

async function adminPublishIssue(event) {
  const denied = await requireAuth(event);
  if (denied) return denied;
  const id = String(event.pathParameters?.id ?? '');
  const dryRun = event.queryStringParameters?.dryrun === '1';

  const res = await ddb.send(new GetCommand({ TableName: ISSUES_TABLE, Key: { id } }));
  const issue = res.Item;
  if (!issue) return json(404, { ok: false, message: `${epLabel(id)} 不存在，请先保存` });
  if (!issue.title || !issue.subject || !issue.body) {
    return json(400, { ok: false, message: '内容不完整：标题、主题、正文不能为空' });
  }

  // 渲染邮件（articleHtml 为干净正文，供网页存档与 Substack 镜像）
  const { html, text, articleHtml } = renderIssueEmail({
    issue: id,
    subject: issue.subject,
    description: issue.description,
    bodyMarkdown: issue.body,
  });

  const pubDate = new Date().toISOString().slice(0, 10);
  await ddb.send(new PutCommand({
    TableName: ISSUES_TABLE,
    Item: { ...issue, status: 'published', pubDate, html, text, articleHtml, updatedAt: new Date().toISOString() },
  }));

  if (dryRun) {
    return json(200, { ok: true, dryRun: true, message: `试运行通过：${epLabel(id)} 已标记发布（未实际发送）` });
  }

  // 更新邮件模板 + 批量发送
  const templateContent = { Subject: '{{subject}}', Html: html, Text: text };
  try {
    await ses.send(new CreateEmailTemplateCommand({ TemplateName: EMAIL_TEMPLATE, TemplateContent: templateContent }));
  } catch (err) {
    if (err?.name === 'AlreadyExistsException') {
      await ses.send(new UpdateEmailTemplateCommand({ TemplateName: EMAIL_TEMPLATE, TemplateContent: templateContent }));
    } else {
      throw err;
    }
  }

  const result = await sendIssueToSubscribers(id, issue.subject);
  return json(200, {
    ok: true,
    message: `${epLabel(id)} 发布完成：成功 ${result.sent}，失败 ${result.failed}`,
    ...result,
  });
}

async function sendIssueToSubscribers(issueId, subject) {
  let items = [];
  let key;
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: '#s = :s',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'confirmed' },
      ExclusiveStartKey: key,
    }));
    items = items.concat(res.Items ?? []);
    key = res.LastEvaluatedKey;
  } while (key);

  const emails = [...new Set(items.map((it) => it.email).filter(Boolean))];
  if (emails.length === 0) return { sent: 0, failed: 0, recipients: 0 };

  const entries = emails.map((email) => ({
    Destination: { ToAddresses: [email] },
    ReplacementEmailContent: {
      ReplacementTemplate: {
        ReplacementTemplateData: JSON.stringify({
          subject,
          email,
          unsubscribeUrl: `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&confirm=1`,
        }),
      },
    },
  }));

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);
    try {
      const res = await ses.send(new SendBulkEmailCommand({
        FromEmailAddress: FROM,
        ReplyToAddresses: [REPLY_TO],
        BulkEmailEntries: batch,
        DefaultContent: {
          Template: {
            TemplateName: EMAIL_TEMPLATE,
            TemplateData: JSON.stringify({
              subject,
              email: '',
              unsubscribeUrl: `${SITE_URL}/unsubscribe`,
            }),
          },
        },
        ListManagementOptions: {
          ContactListName: CONTACT_LIST,
          UnsubscribeURL: `${SITE_URL}/unsubscribe`,
        },
      }));
      const results = res.BulkEmailEntryResults ?? [];
      sent += results.filter((s) => s.Status === 'SUCCESS').length;
      failed += results.filter((s) => s.Status !== 'SUCCESS').length;
    } catch (err) {
      console.error('批量发送失败:', err?.name, err?.message);
      failed += batch.length;
    }
  }
  return { sent, failed, recipients: emails.length };
}

async function adminSubscribers(event) {
  const denied = await requireAuth(event);
  if (denied) return denied;
  const res = await ddb.send(new ScanCommand({ TableName: TABLE }));
  const items = res.Items ?? [];
  const counts = { confirmed: 0, pending: 0, unsubscribed: 0, bounced: 0 };
  for (const it of items) {
    if (it.status && counts[it.status] !== undefined) counts[it.status] += 1;
  }
  const subscribers = items
    .map((i) => ({ email: i.email, status: i.status, createdAt: i.createdAt, confirmedAt: i.confirmedAt ?? null }))
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  return json(200, { ok: true, counts, subscribers });
}

/* ================= 公开存档 ================= */

async function publicListIssues() {
  const res = await ddb.send(new ScanCommand({
    TableName: ISSUES_TABLE,
    FilterExpression: '#s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'published' },
  }));
  const issues = (res.Items ?? [])
    .map(({ body, html, text, articleHtml, ...rest }) => rest)
    .sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));
  return json(200, { ok: true, issues });
}

async function publicGetIssue(event) {
  const id = String(event.pathParameters?.id ?? '');
  const res = await ddb.send(new GetCommand({ TableName: ISSUES_TABLE, Key: { id } }));
  const issue = res.Item;
  if (!issue || issue.status !== 'published') {
    return json(404, { ok: false, message: '该期不存在' });
  }
  return json(200, {
    ok: true,
    issue: {
      id: issue.id,
      title: issue.title,
      subject: issue.subject,
      description: issue.description,
      pubDate: issue.pubDate,
      articleHtml: issue.articleHtml ?? issue.html ?? '',
    },
  });
}
