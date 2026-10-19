import fs from 'node:fs';
import path from 'node:path';

export interface Metric {
  id: string; label: string; value: number | null; unit: string;
  change7d?: number | null; sourceUrl: string; asOf: string; scope: string; note?: string;
}
export interface Point { date: string; value: number }
export interface Snapshot {
  schemaVersion: number; asOf: string; observedAt: string; metrics: Metric[];
  series: Record<string, Point[]>; breakdowns: Metric[];
  seriesMeta?: Record<string, Pick<Metric, 'label' | 'unit' | 'sourceUrl' | 'scope'> & { note?: string }>;
  access: { source: string; status: string; note: string; url: string }[];
  update: { collector: string; allowlistedSources: string[]; lastSuccessAt?: string; lastSourceObservationAt?:string; lastLocalRefreshAt?:string; limitations: string[] };
}

export function getSnapshot(kind: 'agents' | 'finance'): Snapshot {
  return JSON.parse(fs.readFileSync(path.resolve(`public/data/${kind}/current.json`), 'utf8'));
}

export function displayValue(value: number | null, unit = 'USD') {
  if (value === null || !Number.isFinite(value)) return '未公开';
  if (unit === '%') return `${value.toFixed(1)}%`;
  const formatted = new Intl.NumberFormat('en-US', { notation: value >= 1e6 ? 'compact' : 'standard', maximumFractionDigits: value >= 1e6 ? 2 : value < 10 ? 2 : 0 }).format(value);
  return `${unit.toUpperCase().includes('USD') ? '$' : ''}${formatted}`;
}

export function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

/** Reject malformed dates and unsafe source links at the static-data boundary. */
export function validateLandscape(snapshot: Snapshot, entities: {id:string;url:string;reviewedAt:string;sector:string;evidence:{url:string;date?:string}[]}[], items:{url:string;publishedAt:string}[], sectors:readonly {id:string}[]) {
  const date=(value:string)=>{if(!value||Number.isNaN(new Date(value).getTime()))throw new Error(`Invalid landscape date: ${value}`);};
  const link=(value:string)=>{
    if(/^\/data\/[a-z0-9/._-]+$/.test(value))return;
    const url=new URL(value);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid landscape source URL');
  };
  date(snapshot.asOf);date(snapshot.observedAt);date(snapshot.update.lastSourceObservationAt||snapshot.update.lastSuccessAt||snapshot.observedAt);
  const ids=new Set<string>();
  const catalogMetric=snapshot.metrics.find(metric=>metric.id==='agent-capability-catalog-count');
  if(catalogMetric && catalogMetric.value!==entities.length)throw new Error('Agent catalog count does not reconcile with the page registry');
  for(const entity of entities){
    if(ids.has(entity.id))throw new Error(`Duplicate landscape entity: ${entity.id}`);
    ids.add(entity.id);link(entity.url);date(entity.reviewedAt);
    if(!sectors.some(s=>s.id===entity.sector))throw new Error(`Unknown sector for ${entity.id}: ${entity.sector}`);
    for(const evidence of entity.evidence){link(evidence.url);if(evidence.date)date(evidence.date);}
  }
  for(const metric of [...snapshot.metrics,...snapshot.breakdowns]){link(metric.sourceUrl);date(metric.asOf);if(metric.value!==null&&!Number.isFinite(metric.value))throw new Error(`Invalid landscape value: ${metric.id}`);}
  for(const [id,points] of Object.entries(snapshot.series)){
    if(!snapshot.seriesMeta?.[id])throw new Error(`Missing series provenance: ${id}`);
    const dates=new Set<string>();
    for(const point of points){date(point.date);if(dates.has(point.date))throw new Error(`Duplicate daily observation in ${id}: ${point.date}`);dates.add(point.date);if(!Number.isFinite(point.value))throw new Error(`Invalid series observation: ${id}`);}
  }
  for(const meta of Object.values(snapshot.seriesMeta||{}))link(meta.sourceUrl);
  for(const access of snapshot.access)link(access.url);
  for(const item of items){link(item.url);date(item.publishedAt);}
}
