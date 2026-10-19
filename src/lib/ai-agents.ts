import fs from 'node:fs';
import path from 'node:path';
import { aiEditorial } from '../data/ai-agents';
import type { LandscapeItem } from '../data/ecosystem';

export interface AgentSource {
  id: string; name: string; url: string; kind: string; status: string;
  observedAt: string | null; attemptedAt: string; items: LandscapeItem[];
  stars?: number; forks?: number; repoUrl?: string;
}
export interface AgentFeed { schemaVersion: number; attemptedAt: string; sources: AgentSource[]; scheduled: boolean }

export function getAgentFeed() {
  const feed: AgentFeed = JSON.parse(fs.readFileSync(path.resolve('public/data/ai-agents/current.json'), 'utf8'));
  const seen = new Set<string>();
  const news = [...aiEditorial, ...feed.sources.flatMap(source => source.items)]
    .filter(item => {
      const url = new URL(item.url);
      const time = Date.parse(item.publishedAt);
      if (url.protocol !== 'https:' || !Number.isFinite(time) || time > Date.now()) throw new Error('Invalid AI news provenance');
      const key = item.publisher === 'DeepSeek' ? `DeepSeek:${item.publishedAt.slice(0, 10)}` : `${url.origin}${url.pathname}${url.hash}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { ...feed, news };
}
