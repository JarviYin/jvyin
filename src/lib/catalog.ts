export type CatalogSort = 'name' | 'sector' | 'sources' | 'reviewed';
export type CatalogOrder = 'asc' | 'desc';
export interface CatalogEntity {
  id: string;
  name: string;
  url: string;
  summary: string;
  sector: string;
  chains: string[];
  stage: string;
  roles: string[];
  capabilities: string[];
  reviewedAt: string;
  evidence: { url: string }[];
}
export interface CatalogFilters { q: string; sector: string; chain: string; stage: string }
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

export function catalogRows<T extends CatalogEntity>(entities: T[], filters: CatalogFilters, sort: CatalogSort, order: CatalogOrder, sectors: Map<string, string>): T[] {
  const search = filters.q.trim().toLocaleLowerCase();
  return entities.filter(entity => {
    const text = [entity.name, entity.summary, ...entity.roles, ...entity.capabilities, ...entity.chains].join(' ').toLocaleLowerCase();
    return (!search || text.includes(search))
      && (filters.sector === 'all' || entity.sector === filters.sector)
      && (filters.chain === 'all' || entity.chains.includes(filters.chain))
      && (filters.stage === 'all' || entity.stage === filters.stage);
  }).sort((a, b) => {
    const value = sort === 'sources' ? a.evidence.length - b.evidence.length
      : sort === 'reviewed' ? a.reviewedAt.localeCompare(b.reviewedAt)
      : sort === 'sector' ? collator.compare(sectors.get(a.sector) || a.sector, sectors.get(b.sector) || b.sector)
      : collator.compare(a.name, b.name);
    return value * (order === 'desc' ? -1 : 1) || collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}

function csvCell(value: string): string {
  // Prevent spreadsheet formulas when the exported text is opened in Excel.
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function catalogCsv(entities: CatalogEntity[], sectors: Map<string, string>): string {
  const stages: Record<string, string> = { active: '已发布', announced: '已公告', proposed: '提案' };
  const rows = [
    ['项目', '板块', '网络', '披露能力', '阶段', '核验日期', '官网', '原始来源'],
    ...entities.map(entity => [entity.name, sectors.get(entity.sector) || entity.sector, entity.chains.join(' / '), entity.capabilities.join(' / '), stages[entity.stage] || entity.stage, entity.reviewedAt, entity.url, entity.evidence.map(source => source.url).join(' | ')]),
  ];
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
