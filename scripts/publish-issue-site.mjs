#!/usr/bin/env node
/**
 * 把 src/content/newsletters/<NNN>.md 写入 DynamoDB 并标记 published（仅网站存档，不群发邮件）。
 * 用法: node scripts/publish-issue-site.mjs 002
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { renderIssueEmail, epLabel } from '../shared/email-layout.mjs';

const REGION = 'us-east-1';
const ISSUES_TABLE = 'jvyin-issues';
const ID = String(process.argv[2] ?? '').padStart(3, '0');
if (!/^\d{3}$/.test(ID)) {
  console.error('用法: node scripts/publish-issue-site.mjs <期号>');
  process.exit(1);
}

const mdPath = path.resolve(process.cwd(), 'src/content/newsletters', `${ID}.md`);
const { data, content } = matter(readFileSync(mdPath, 'utf8'));
const body = content.trim();
const pubDate = typeof data.pubDate === 'string'
  ? data.pubDate.slice(0, 10)
  : new Date().toISOString().slice(0, 10);

const { html, text, articleHtml } = renderIssueEmail({
  issue: ID,
  subject: data.subject,
  description: data.description ?? '',
  bodyMarkdown: body,
});

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const existing = await ddb.send(new GetCommand({ TableName: ISSUES_TABLE, Key: { id: ID } }));
const prev = existing.Item ?? {};

const item = {
  id: ID,
  title: String(data.title ?? prev.title ?? '').trim(),
  subject: String(data.subject ?? prev.subject ?? '').trim(),
  description: String(data.description ?? prev.description ?? '').trim(),
  body,
  status: 'published',
  pubDate,
  html,
  text,
  articleHtml,
  updatedAt: new Date().toISOString(),
};

await ddb.send(new PutCommand({ TableName: ISSUES_TABLE, Item: item }));
console.log(`${epLabel(ID)} 已发布到网站存档（未群发邮件）`);
console.log('title:', item.title);
console.log(`url: https://jvyin.com/newsletter/${ID}/`);
