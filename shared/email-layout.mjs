/**
 * 邮件布局与渲染（Lambda 与本地发刊脚本共用）
 */
import { marked } from 'marked';

const SITE = 'https://jvyin.com';
export const NEWSLETTER_NAME = 'AI agent & On-chain Finance';

/** 期号显示格式：001 → EP01 */
export const epLabel = (id) => `EP${String(Number(id)).padStart(2, '0')}`;

/** 渲染正文 Markdown 为干净 HTML（网页存档 / Substack 镜像用） */
export function renderBodyHtml(bodyMarkdown) {
  return marked.parse(bodyMarkdown ?? '');
}

/**
 * 渲染一期 newsletter 的邮件 HTML 与纯文本
 * 模板变量（由 SES 模板替换，每收件人独立）：
 *   {{subject}} {{email}} {{unsubscribeUrl}}
 */
export function renderIssueEmail({ issue, subject, description, bodyMarkdown }) {
  const archiveUrl = `${SITE}/newsletter/${issue}/`;
  const inner = renderBodyHtml(bodyMarkdown);
  const articleHtml = inner;
  const preheader = description ?? '';
  const bodyText = (bodyMarkdown ?? '').trim();
  const ep = epLabel(issue);

  const html = `<!doctype html>
<html lang="zh-CN">
<body style="margin:0;padding:0;background:#f4f4f4">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e4">
      <tr>
        <td style="padding:28px 32px;font-family:-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#161616;font-size:15px;line-height:1.8">
          <div style="font-family:Georgia,'Songti SC',serif;font-size:22px;font-weight:700;padding-bottom:16px;border-bottom:1px solid #e4e4e4;margin-bottom:24px">
            ${NEWSLETTER_NAME} <span style="color:#9c9c9c;font-size:13px;font-weight:400">· ${ep}</span>
          </div>
          <span style="display:none;max-height:0;overflow:hidden">${preheader}&zwnj;&nbsp;</span>
          ${inner}
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #e4e4e4;color:#9c9c9c;font-size:12px;line-height:1.7">
            这封邮件发往 {{email}}。<br>
            不想再收到？<a href="{{unsubscribeUrl}}" style="color:#9c9c9c">一键退订</a> ·
            <a href="${archiveUrl}" style="color:#9c9c9c">网页存档</a>
          </div>
        </td>
      </tr>
    </table>
    <div style="text-align:center;color:#b3b3b3;font-size:11px;padding-top:14px">
      ${NEWSLETTER_NAME} · ${SITE}<br>
      本邮件由 AI 辅助撰写，人类负责背锅。
    </div>
  </div>
</body>
</html>`;

  const text = `${subject}\n\n${bodyText}\n\n—\n这封邮件发往 {{email}}。\n退订: {{unsubscribeUrl}}\n网页存档: ${archiveUrl}\n`;

  return { html, text, archiveUrl, articleHtml };
}
