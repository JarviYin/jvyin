/** Shared, public-facing site information. */
export const site = {
  title: 'Jv 家伟个人网页',
  name: 'Jv 家伟',
  tagline: 'AI Agent-Native Onchain Finance | Research • Build • Invest',
  description: 'jvyin：AI agents 与链上金融的研究、产品与投资实践。',
  url: 'https://jvyin.com',
  email: 'jmyjw119@gmail.com',
  wechat: '家伟同学',
  socials: [
    { label: 'X / Twitter', href: 'https://x.com/jvyincom' },
    { label: 'GitHub', href: 'https://github.com/JarviYin' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jarvi-yin-190653165/' },
    { label: 'RSS', href: '/rss.xml' },
    { label: 'Email', href: 'mailto:jmyjw119@gmail.com' },
  ],
  newsletter: {
    name: 'AI agent & On-chain Finance',
    blurb: 'AI agent 和链上金融。每周五一封：认真讲事，不正经说话。',
    frequency: '频率：每周五',
    subscribeNote: '订阅后你会收到一封确认邮件，点击确认即完成。可随时一键退订。',
  },
  research: [
    {
      title: '死掉的 Hyperliquid 前端',
      href: '/research/hyperliquid-builders/',
      desc: '谁还在收 builder fee，谁已经停了。UXUY、HyperSignals、Supercexy 各自为什么停。打开页面时更新数字。',
      eyebrow: 'MARKET STRUCTURE',
    },
  ],
};

export const POSTS_PER_PAGE = 10;
