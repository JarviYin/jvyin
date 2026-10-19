#!/usr/bin/env node
/**
 * 发刊脚本：把 src/content/newsletters/<NNN>.md 渲染成邮件，经 SES 批量发送。
 *
 * 用法:
 *   node scripts/send-newsletter.mjs 001 --dry-run   # 试运行（不发信）
 *   node scripts/send-newsletter.mjs 001             # 正式发送
 *
 * 前置: SES 已验证 jvyin.com 且账号有生产访问权限。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  SESv2Client,
  CreateEmailTemplateCommand,
  UpdateEmailTemplateCommand,
  SendBulkEmailCommand,
} from '@aws-sdk/client-sesv2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { renderIssueEmail } from '../shared/email-layout.mjs';

const REGION = 'us-east-1';
const FROM = 'jvyin <newsletter@jvyin.com>';
const REPLY_TO = 'jmyjw119@gmail.com';
const CONTACT_LIST = 'jvyin-newsletter';
const TEMPLATE = 'jvyin-newsletter';
const SITE = 'https://jvyin.com';
const TABLE = 'jvyin-subscribers';

const args = process.argv.slice(2);
const issue = args[0];
const dryRun = args.includes('--dry-run');

if (!issue) {
  console.error('用法: node scripts/send-newsletter.mjs <期号> [--dry-run]');
  process.exit(1);
}

const mdPath = path.resolve(process.cwd(), 'src/content/newsletters', `${issue}.md`);
let data, content;
try {
  ({ data, content } = matter(readFileSync(mdPath, 'utf8')));
} catch {
  console.error(`找不到 ${mdPath}`);
  process.exit(1);
}

const subject = data.subject ?? `${data.title} · jvyin 的 newsletter`;
const { html, text } = renderIssueEmail({
  issue,
  subject,
  description: data.description ?? '',
  bodyMarkdown: content,
});

// ---------- 1. 确保模板存在 ----------
const ses = new SESv2Client({ region: REGION });
const templateContent = { Subject: '{{subject}}', Html: html, Text: text };
try {
  await ses.send(new CreateEmailTemplateCommand({ TemplateName: TEMPLATE, TemplateContent: templateContent }));
  console.log(`模板 ${TEMPLATE} 已创建`);
} catch (err) {
  if (err.name === 'AlreadyExistsException') {
    await ses.send(new UpdateEmailTemplateCommand({ TemplateName: TEMPLATE, TemplateContent: templateContent }));
    console.log(`模板 ${TEMPLATE} 已更新`);
  } else {
    throw err;
  }
}

// ---------- 2. 拉取已确认订阅者 ----------
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
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
console.log(`已确认订阅者: ${emails.length} 人`);
if (emails.length === 0) {
  console.log('没有订阅者，结束。');
  process.exit(0);
}

// ---------- 3. 批量发送（每批 50） ----------
const entries = emails.map((email) => ({
  Destination: { ToAddresses: [email] },
  ReplacementEmailContent: {
    ReplacementTemplate: {
      ReplacementTemplateData: JSON.stringify({
        subject,
        email,
        unsubscribeUrl: `${SITE}/api/unsubscribe?email=${encodeURIComponent(email)}&confirm=1`,
      }),
    },
  },
}));

if (dryRun) {
  console.log('[dry-run] 不发送。');
  console.log('主题:', subject);
  console.log('收件人:', emails.join(', '));
  process.exit(0);
}

let ok = 0;
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
          TemplateName: TEMPLATE,
          TemplateData: JSON.stringify({
            subject,
            email: '',
            unsubscribeUrl: `${SITE}/unsubscribe`,
          }),
        },
      },
      ListManagementOptions: {
        ContactListName: CONTACT_LIST,
        UnsubscribeURL: `${SITE}/unsubscribe`,
      },
    }));
    const results = res.BulkEmailEntryResults ?? [];
    const batchOk = results.filter((s) => s.Status === 'SUCCESS').length;
    const batchFailed = results.filter((s) => s.Status !== 'SUCCESS').length;
    ok += batchOk;
    failed += batchFailed;
    if (batchFailed > 0) {
      for (const r of results.filter((s) => s.Status !== 'SUCCESS')) {
        console.error('  失败:', r.Error);
      }
    }
    console.log(`批次 ${Math.floor(i / 50) + 1}: 成功 ${batchOk}, 失败 ${batchFailed}`);
  } catch (err) {
    failed += batch.length;
    console.error(`批次 ${Math.floor(i / 50) + 1} 发送异常:`, err.message);
  }
}

console.log(`✅ 发送完成: 成功 ${ok}, 失败 ${failed}`);
