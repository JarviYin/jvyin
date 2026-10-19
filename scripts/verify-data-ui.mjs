/** Local checks for catalog behavior and generated table contracts; no network. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/lib/catalog.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { catalogRows, catalogCsv } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const checks = [];
const all = { q: '', sector: 'all', chain: 'all', stage: 'all' };
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

function parseCsv(input) {
  const rows = []; let row = [], field = '', quoted = false;
  const text = input.replace(/^\uFEFF/u, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if (char === '\r' && text[i + 1] === '\n' && !quoted) { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else field += char;
  }
  assert.equal(quoted, false, 'CSV quotes must balance');
  return rows;
}

for (const kind of ['agents', 'onchain-finance']) {
  const html = await readFile(`dist/${kind}/index.html`, 'utf8');
  const payload = JSON.parse(html.match(/<script\b[^>]*data-landscape-payload[^>]*>([\s\S]*?)<\/script>/u)?.[1] || 'null');
  assert.ok(payload?.entities?.length);
  const { entities, sectors } = payload;
  const originalIds = entities.map(entity => entity.id);
  const labels = new Map(sectors.map(sector => [sector.id, sector.label]));
  const ordered = catalogRows(entities, all, 'name', 'asc', labels);
  assert.equal(ordered.length, kind === 'agents' ? 30 : 36);
  for (let i = 1; i < ordered.length; i++) assert.ok(collator.compare(ordered[i - 1].name, ordered[i].name) <= 0);
  const sourceOrder = catalogRows(entities, all, 'sources', 'desc', labels);
  for (let i = 1; i < sourceOrder.length; i++) assert.ok(sourceOrder[i - 1].evidence.length >= sourceOrder[i].evidence.length);
  const reviewed = catalogRows(entities, all, 'reviewed', 'desc', labels);
  for (let i = 1; i < reviewed.length; i++) assert.ok(reviewed[i - 1].reviewedAt >= reviewed[i].reviewedAt);
  const one = entities[0];
  const filtered = catalogRows(entities, { q: ` ${one.name.toUpperCase()} `, sector: one.sector, chain: one.chains[0], stage: one.stage }, 'name', 'asc', labels);
  assert.ok(filtered.some(entity => entity.id === one.id));
  assert.ok(filtered.every(entity => entity.sector === one.sector && entity.chains.includes(one.chains[0]) && entity.stage === one.stage));
  assert.equal(catalogRows(entities, { ...all, q: 'no-such-project-qa-20261018' }, 'name', 'asc', labels).length, 0);
  assert.deepEqual(entities.map(entity => entity.id), originalIds, 'Sorting must not mutate source data');
  const csv = catalogCsv(filtered, labels);
  assert.ok(csv.startsWith('\uFEFF'));
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, filtered.length + 1);
  parsed.forEach(row => assert.equal(row.length, 8));
  assert.deepEqual(parsed.slice(1).map(row => row[0]), filtered.map(entity => entity.name));
  assert.ok(parsed[1][7].includes(filtered[0].evidence[0].url));
  assert.equal((html.match(/<tr data-entity=/gu) || []).length, entities.length);
  for (const attribute of ['data-project-grid', 'data-catalog-export', 'data-sort="name"', 'data-sort="sector"', 'data-sort="sources"', 'data-sort="reviewed"', 'data-filter-empty', 'data-compare-dialog']) assert.ok(html.includes(attribute), `Missing ${attribute}`);
  assert.ok(!html.includes('ls-orbit'), 'Decorative orbit must be removed');
  checks.push({ route: `/${kind}/`, entities: entities.length, behavior: ['name/source/date sorting', 'combined filters', 'empty result', 'CSV selection/source provenance', 'table/runtime contracts'] });
}

const malicious = { id: 'test', name: '=SUM(1,2)', summary: '', url: 'https://example.com/', sector: 'test', chains: ['Ethereum'], stage: 'active', roles: [], capabilities: ['quoted "label"', 'line\nbreak'], reviewedAt: '2026-10-18', evidence: [{ url: 'https://example.com/docs' }] };
const escaped = parseCsv(catalogCsv([malicious], new Map()));
assert.equal(escaped[1][0], "'=SUM(1,2)");
assert.equal(escaped[1][3], 'quoted "label" / line\nbreak');
for (const name of ['+1', '-1', '@SUM(1)', '\t=SUM(1)']) assert.ok(parseCsv(catalogCsv([{ ...malicious, name }], new Map()))[1][0].startsWith("'"));
checks.push({ behavior: ['CSV formula injection protection', 'CSV quote/comma/newline round trip'] });
const share = await readFile('src/scripts/share.ts', 'utf8');
assert.ok(share.includes("'sort', 'order'"), 'Shared catalog views must preserve sorting');
await mkdir('outputs/data-ui-redesign-20261018', { recursive: true });
await writeFile('outputs/data-ui-redesign-20261018/catalog-qa.json', JSON.stringify({ scope: 'Local pure functions and static output; not browser rendering', checkedAt: new Date().toISOString(), checks, result: 'pass' }, null, 2) + '\n');
console.log(JSON.stringify({ result: 'pass', routes: 2, catalogCounts: [30, 36], csvSafety: 'pass' }, null, 2));
