import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const html = '<article id="top">' + fs.readFileSync(new URL('src/content/research/hyperliquid-builders-hero.html', root), 'utf8') + fs.readFileSync(new URL('src/content/research/hyperliquid-builders.html', root), 'utf8') + '</article>';
const data = JSON.parse(fs.readFileSync(new URL('public/research/hyperliquid-builders-data.json', root), 'utf8'));
const source = fs.readFileSync(new URL('src/scripts/builders.js', root), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ids');
assert(!/<[^>]*\bclass="[^"]*"[^>]*\bclass="/.test(html), 'Duplicate class attributes');
for (const href of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(href[1]), 'Broken anchor: ' + href[1]);

new vm.Script(source);
const context = vm.createContext({
  document: { getElementById() {} },
  window: { matchMedia: () => ({ matches: false }) },
  Intl, Number, Math
});
vm.runInContext(source.replace(/init\(\);\s*$/, '') + '\nglobalThis.audit = { isComparable, statusOf, money, WATCH };', context);
const { isComparable, statusOf, money, WATCH } = context.audit;
const comparable = data.protocols.filter(isComparable);
for (const slug of ['tradexyz', 'basedapp-spot', 'basedapp-outcome', 'dreamcash-markets', 'minara-ai-perps', 'hypersignals']) {
  assert(!comparable.some(p => p.slug === slug), 'Incorrectly included: ' + slug);
}
for (const slug of ['phantom-perps', 'basedapp-perps', 'fomo-perps', 'metamask-perps', 'trust-wallet-perps', 'dreamcash-interface']) {
  assert(comparable.some(p => p.slug === slug), 'Missing frontend: ' + slug);
}
for (const item of WATCH.filter(item => !item.owner)) {
  assert(data.protocols.some(p => p.slug === item.slug), 'Broken protocol slug: ' + item.slug);
}
assert.equal(statusOf({ totalAllTime: 50000 }).text, '数据不足');
assert.notEqual(money(.01), money(0), 'Tiny nonzero fees displayed as zero');
const measured = comparable.filter(p => typeof p.total30d === 'number');
const total = measured.reduce((sum, p) => sum + p.total30d, 0);
assert(total > 8e6 && total < 9e6, 'Comparable total changed unexpectedly');
assert(!JSON.stringify(data).includes('userAddress'), 'Raw user fill data leaked into public snapshot');
for (const sample of data.samples.filter(s => s.fills)) {
  assert(Number.isFinite(sample.weightedBps) && sample.weightedBps >= 0);
  assert(sample.sources.every(url => url.startsWith('https://stats-data.hyperliquid.xyz/Mainnet/builder_fills/')));
}

const nodes = new Map();
const node = id => nodes.get(id) || (nodes.set(id, { textContent: '', hidden: false, disabled: false }), nodes.get(id));
const fallbackContext = vm.createContext({
  document: { getElementById: node },
  window: { matchMedia: () => ({ matches: false }) },
  Intl, Number, Math, AbortSignal,
  fetch: async () => { throw new Error('QA simulated unavailable API'); }
});
vm.runInContext(source.replace(/init\(\);\s*$/, '') + `
  rows = [{ name: 'Retained data' }];
  dataStamp = '快照抓取 2026/10/18 17:00:20';
  globalThis.refreshForAudit = refresh;
`, fallbackContext);
await fallbackContext.refreshForAudit();
assert.equal(node('refresh').disabled, false, 'Retry did not recover');
assert.equal(node('err').hidden, false, 'Failure message hidden');
assert.match(node('stamp').textContent, /快照抓取.*实时刷新失败/);
assert.match(node('err').textContent, /保留上述日期的数据/);

console.log(JSON.stringify({ htmlIds: ids.length, comparable: comparable.length, measured30d: measured.length, total30d: total, sampledBuilders: data.samples.filter(s => s.fills).length, fallback: 'pass' }, null, 2));
