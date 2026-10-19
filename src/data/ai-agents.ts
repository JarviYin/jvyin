import type { EcosystemEntity, LandscapeItem } from './ecosystem';

export const aiSectors = [
  { id: 'ai-assistants', label: '模型与助手', description: '通用助手和模型服务；模型能力不等于可独立执行完整任务。' },
  { id: 'ai-coding', label: 'Coding agents', description: '连接代码、终端与开发环境的任务执行产品。' },
  { id: 'ai-computer', label: 'Computer agents', description: '通过电脑、浏览器和应用完成多步骤工作的代理。' },
] as const;

const reviewedAt = '2026-10-19';
const roleLabels: Record<string, string> = { 'ai-assistants': '模型与通用助手', 'ai-coding': '编程任务代理', 'ai-computer': '电脑任务代理' };
const product = (id: string, name: string, url: string, sector: string, summary: string, capabilities: string[], source: string, publisher: string): EcosystemEntity => ({
  id, name, url, sector, summary, capabilities, pages: ['agents'], roles: [roleLabels[sector] || 'AI 产品'], chains: ['非链上产品'], stage: 'active', reviewedAt,
  evidence: [{ label: `${name} 官方资料`, url: source, publisher }],
});

export const aiProducts: EcosystemEntity[] = [
  product('claude', 'Claude', 'https://claude.ai/', 'ai-assistants', 'Anthropic 的通用工作助手，覆盖研究、写作、文件与连接工具的任务。具体可用能力依计划与地区而异。', ['研究与文件', '连接工具'], 'https://claude.com/product/overview', 'Anthropic'),
  product('chatgpt', 'ChatGPT / GPT', 'https://chatgpt.com/', 'ai-assistants', 'OpenAI 的助手产品；GPT 是模型系列，ChatGPT agent 是任务执行体验，三者不混为同一层。', ['研究与分析', 'Agent 任务'], 'https://openai.com/index/introducing-chatgpt-agent/', 'OpenAI'),
  product('deepseek', 'DeepSeek', 'https://chat.deepseek.com/', 'ai-assistants', '提供聊天、推理与 API。10 月 17 日官方更新包含 V4.1-Flash-1017 及 Search / Fetch API。', ['推理与工具调用', 'Search / Fetch'], 'https://api-docs.deepseek.com/updates/', 'DeepSeek'),
  product('grok', 'Grok', 'https://grok.com/', 'ai-assistants', 'Grok 助手入口；与具备持久电脑环境的 Grok Bot 分开收录。', ['对话与搜索', '多模态'], 'https://docs.x.ai/grok/overview', 'xAI'),
  product('codex', 'Codex', 'https://openai.com/codex/', 'ai-coding', '连接代码与开发工具的工作代理，提供本地及云端任务体验。仓库数据追踪开源 CLI，不能代表整个产品采用量。', ['代码与终端', '本地 / 云端任务'], 'https://openai.com/codex/', 'OpenAI'),
  product('claude-code', 'Claude Code', 'https://claude.com/product/claude-code', 'ai-coding', '面向终端和开发工作流的代理产品。公开仓库的 stars、版本发布仅反映仓库活动。', ['代码库理解', '终端工作流'], 'https://claude.com/product/claude-code', 'Anthropic'),
  product('grok-bot', 'Grok Bot', 'https://x.ai/bot', 'ai-computer', '拥有持久云端电脑的任务代理，可跨应用工作、保留上下文和设置例行任务；使用资格以官方说明为准。', ['持久云端电脑', '跨应用任务', '例行工作'], 'https://docs.x.ai/grok-bot/overview', 'xAI'),
];

export const aiEditorial: LandscapeItem[] = [
  { id: 'deepseek-1017', title: 'DeepSeek 更新 Flash 模型，并开放 Search / Fetch API', url: 'https://api-docs.deepseek.com/updates/#date-2026-10-17', publisher: 'DeepSeek', publishedAt: '2026-10-17', summary: '官方变更日志记录了 V4.1-Flash-1017 与搜索接口更新；能力、价格与评测设置需分别查看。', topic: 'ai', kind: 'release', evidenceLevel: 'primary' },
  { id: 'haiku-55', title: 'Claude Haiku 5.5：面向高频任务的小模型更新', url: 'https://www.anthropic.com/claude-haiku-5-5', publisher: 'Anthropic', publishedAt: '2026-10-07', summary: '官方发布资料。厂商评测与真实任务表现分开看，不以单一分数推导产品排名。', topic: 'ai', kind: 'release', evidenceLevel: 'primary' },
  { id: 'grok-bot-intro', title: 'Grok Bot：从对话助手走向持久电脑上的任务代理', url: 'https://x.ai/news/introducing-grok-bot', publisher: 'xAI', publishedAt: '2026-08-11', summary: '官方发布说明介绍云端电脑、跨应用任务与多代理协作；能力披露不等于独立验证的完成率。', topic: 'ai', kind: 'release', evidenceLevel: 'primary' },
  { id: 'effective-agents', title: 'Building effective agents：工作流与 Agent 的边界', url: 'https://www.anthropic.com/engineering/building-effective-agents', publisher: 'Anthropic', publishedAt: '2024-12-19', summary: '基础方法阅读：从可组合的简单模式出发，理解工作流、工具与自主决策之间的区别。', topic: 'ai', kind: 'report', evidenceLevel: 'primary' },
];
