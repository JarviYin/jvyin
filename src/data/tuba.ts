export interface TubaProject {
  id: string;
  name: string;
  url: string;
  category: 'trading' | 'research' | 'experiments';
  categoryLabel: string;
  description: string;
}

export interface TubaFocus {
  title: 'Research' | 'Build' | 'Invest';
  description: string;
}

/** Public-facing project index. It intentionally describes focus, not operating status. */
export const tubaProjects: TubaProject[] = [
  {
    id: 'hypercoco',
    name: 'HyperCoco',
    url: 'https://hypercoco.com',
    category: 'trading',
    categoryLabel: '交易',
    description: '面向链上永续市场的 AI 交易交互与执行探索。',
  },
  {
    id: 'hypii',
    name: 'hypii',
    url: 'https://hypii.ai',
    category: 'trading',
    categoryLabel: '交易',
    description: '围绕跨市场行情、策略与交易执行的 AI agent 研究。',
  },
  {
    id: 'civor',
    name: 'Civor',
    url: 'https://civor.ai',
    category: 'research',
    categoryLabel: '研究',
    description: '将投资信息源、阅读与研究工作流汇聚到一个入口。',
  },
  {
    id: 'pre-daily',
    name: 'pre-daily',
    url: 'https://pre-daily.com',
    category: 'research',
    categoryLabel: '研究',
    description: '关注预测市场信号与中文市场叙事的日常研究产品。',
  },
  {
    id: 'buyhype',
    name: 'BuyHYPE',
    url: 'https://buyhype.org',
    category: 'research',
    categoryLabel: '研究',
    description: '围绕 HYPE 的价格、链上与市场信号研究工具。',
  },
  {
    id: 'clawpk',
    name: 'ClawPK',
    url: 'https://clawpk.ai',
    category: 'experiments',
    categoryLabel: '实验',
    description: '关于 AI agent、市场信息与交易机制的实验性项目。',
  },
  {
    id: 'dabanzi',
    name: 'dabanzi',
    url: 'https://dabanzi.ai',
    category: 'experiments',
    categoryLabel: '实验',
    description: '探索 AI 在跨境电商创意素材与内容工作流中的应用。',
  },
];

export const tubaFocus: TubaFocus[] = [
  {
    title: 'Research',
    description: '研究 AI agents、链上金融与市场结构，形成可检验的判断。',
  },
  {
    title: 'Build',
    description: '把研究问题做成工具、产品与可复用的工作流。',
  },
  {
    title: 'Invest',
    description: '用长期视角研究资产、网络与技术变化，审慎配置资本。',
  },
];
