import rss from '@astrojs/rss';
import { site } from '../site.config';
import { getNewsletters } from '../lib/newsletters';

const researchItems = [
  {
    title: '死掉的 Hyperliquid 前端',
    description: '谁在收 builder fee，收了几个 bps，费用归谁，以及前端回落背后的不同路径。',
    pubDate: new Date('2026-10-18T00:00:00Z'),
    link: '/research/hyperliquid-builders/',
  },
];

export async function GET(context) {
  const newsletterItems = getNewsletters().map((issue) => ({
    title: `Newsletter · ${issue.title}`,
    description: issue.description,
    pubDate: new Date(`${issue.pubDate}T00:00:00Z`),
    link: `/newsletter/${issue.id}/`,
  }));

  const items = [...newsletterItems, ...researchItems].sort(
    (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
  );

  return rss({
    title: site.title,
    description: site.description,
    site: context.site,
    customData: `<language>zh-cn</language>`,
    items,
  });
}
