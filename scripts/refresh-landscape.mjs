import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const NOW = new Date();
const ISO = NOW.toISOString();
const DAY = ISO.slice(0, 10);
// Manual observations keep their source review date across automatic refreshes.
const RWA_OBSERVATION_DAY = '2026-10-18';
const TIMEOUT_MS = 15_000;
const SOURCES = {
  globalTvl: 'https://api.llama.fi/v2/historicalChainTvl',
  stablecoins: 'https://stablecoins.llama.fi/stablecoins?includePrices=true',
  stablecoinHistory: 'https://stablecoins.llama.fi/stablecoincharts/all',
  dex: 'https://api.llama.fi/overview/dexs?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=true',
};

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.json();
}

function number(value, name) {
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric field: ${name}`);
  return value;
}

function dayFromUnix(seconds) {
  return new Date(seconds * 1_000).toISOString().slice(0, 10);
}

function dailySeries(rows, valueKey) {
  if (!Array.isArray(rows)) throw new Error('Expected array series');
  return rows.filter((row) => Number.isFinite(row?.date) && Number.isFinite(row?.[valueKey]))
    .map((row) => ({ date: dayFromUnix(row.date), value: row[valueKey] }));
}

function change(current, prior) {
  return Number.isFinite(prior) && prior !== 0 ? ((current - prior) / prior) * 100 : null;
}

function latest(series) {
  const value = series.at(-1);
  if (!value) throw new Error('Series was empty');
  return value;
}

function pointDaysAgo(series, days) {
  return series.length > days ? series.at(-1 - days) : undefined;
}

function stablecoinBreakdowns(peggedAssets) {
  if (!Array.isArray(peggedAssets)) throw new Error('Invalid stablecoin asset list');
  return peggedAssets
    .map((asset) => ({
      id: `stablecoin-${String(asset.symbol || asset.id).toLowerCase()}`,
      label: asset.symbol || asset.name,
      value: asset.circulating?.peggedUSD,
      unit: 'USD',
      sourceUrl: SOURCES.stablecoins,
      asOf: DAY,
      scope: 'DefiLlama 返回的单资产 peggedUSD 流通面额估算。',
    }))
    .filter((entry) => Number.isFinite(entry.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function buildFinance({ tvlRows, stablecoins, stablecoinHistory, dex }) {
  const tvl = dailySeries(tvlRows, 'tvl');
  const stableHistory = Array.isArray(stablecoinHistory)
    ? stablecoinHistory.map((row) => ({ date: dayFromUnix(row.date), value: row.totalCirculatingUSD?.peggedUSD })).filter((row) => Number.isFinite(row.value))
    : [];
  const dexSeries = Array.isArray(dex.totalDataChart)
    ? dex.totalDataChart.map((row) => ({ date: dayFromUnix(row[0]), value: row[1] })).filter((row) => Number.isFinite(row.value))
    : [];
  const tvlLast = latest(tvl);
  const stableLast = latest(stableHistory);
  const dexLast = latest(dexSeries);
  const totalStablecoins = stablecoins.peggedAssets.reduce((sum, asset) => sum + (Number(asset.circulating?.peggedUSD) || 0), 0);
  number(totalStablecoins, 'stablecoin total');
  number(dex.total24h, 'DEX 24h total');
  return {
    schemaVersion: 1,
    asOf: DAY,
    observedAt: ISO,
    metrics: [
      { id: 'global-defi-tvl', label: '全球 DeFi TVL', value: tvlLast.value, unit: 'USD', change7d: change(tvlLast.value, pointDaysAgo(tvl, 7)?.value), sourceUrl: SOURCES.globalTvl, asOf: tvlLast.date, scope: 'DefiLlama 全球链 TVL 序列，具体方法由来源定义。', note: 'TVL 不代表用户资产、协议收入或已实现收益。' },
      { id: 'stablecoin-circulating-face-value', label: '美元锚定稳定币流通面额', value: totalStablecoins, unit: 'USD', change7d: change(totalStablecoins, stablecoins.peggedAssets.reduce((sum, asset) => sum + (Number(asset.circulatingPrevWeek?.peggedUSD) || 0), 0)), sourceUrl: SOURCES.stablecoins, asOf: DAY, scope: 'DefiLlama 返回资产的 peggedUSD 流通面额之和。', note: '这是锚定面额口径，非按价格调整的市场价值，也不是交易额或活跃用户。' },
      { id: 'dex-volume-24h', label: 'DEX 24 小时成交额', value: dex.total24h, unit: 'USD', change7d: Number.isFinite(dex.change_7d) ? dex.change_7d : null, sourceUrl: SOURCES.dex, asOf: DAY, scope: 'DefiLlama 聚合 DEX 成交额，协议纳入范围和方法由来源定义。', note: '不代表代理专属活动。图表序列为来源给出的逐日值，不能当作本指标的滚动 24 小时值。' },
      { id: 'rwa-distributed-asset-value', label: 'RWA.xyz Distributed Asset Value', value: 39_230_000_000, unit: 'USD', change7d: null, sourceUrl: 'https://app.rwa.xyz/', asOf: RWA_OBSERVATION_DAY, scope: 'RWA.xyz 公开首页显示的 Distributed Asset Value。', note: '按可转移性与 Represented 区分；单列展示，不将合计称为可流通规模。来源为公开页舍入值。' },
      { id: 'rwa-represented-asset-value', label: 'RWA.xyz Represented Asset Value', value: 367_740_000_000, unit: 'USD', change7d: null, sourceUrl: 'https://app.rwa.xyz/', asOf: RWA_OBSERVATION_DAY, scope: 'RWA.xyz 公开首页显示的 Represented Asset Value。', note: '按可转移性与 Distributed 区分；单列展示，不将合计称为可流通规模。来源为公开页舍入值。' },
    ],
    series: { 'global-defi-tvl': tvl, 'stablecoin-circulating-usd-value': stableHistory, 'dex-volume-daily': dexSeries },
    seriesMeta: {
      'global-defi-tvl': { label: '全球 DeFi TVL', unit: 'USD', sourceUrl: SOURCES.globalTvl, scope: 'DefiLlama 全球链 TVL 原始日序列，缺口保留。' },
      'stablecoin-circulating-usd-value': { label: '稳定币流通美元价值', unit: 'USD', sourceUrl: SOURCES.stablecoinHistory, scope: 'DefiLlama totalCirculatingUSD 的 peggedUSD 原始日序列；它与当前流通面额指标不是同一口径。' },
      'dex-volume-daily': { label: 'DEX 每日成交额', unit: 'USD', sourceUrl: SOURCES.dex, scope: 'DefiLlama 返回的 DEX 原始逐日聚合成交额，不等于滚动 24 小时指标。' },
    },
    breakdowns: stablecoinBreakdowns(stablecoins.peggedAssets).concat([
      { id: 'rwa-xyz-distributed-total', label: 'RWA.xyz Distributed 总额', value: 39_230_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/', asOf: RWA_OBSERVATION_DAY, scope: '公开首页人工观察；Distributed 口径。' },
      { id: 'rwa-xyz-represented-total', label: 'RWA.xyz Represented 总额', value: 367_740_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/', asOf: RWA_OBSERVATION_DAY, scope: '公开首页人工观察；Represented 口径。' },
      { id: 'rwa-xyz-treasuries-distributed', label: 'RWA.xyz 国债 Distributed Value', value: 14_710_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/treasuries', asOf: RWA_OBSERVATION_DAY, scope: '国债分类公开页人工观察；Distributed Value 独立口径。' },
      { id: 'rwa-xyz-treasuries-represented', label: 'RWA.xyz 国债 Represented Value', value: 90_280_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/treasuries', asOf: RWA_OBSERVATION_DAY, scope: '国债分类公开页人工观察；Represented Value 独立口径，不能与 Distributed 混称为可流通规模。' },
      { id: 'rwa-xyz-credit-distributed', label: 'RWA.xyz 信贷 Distributed Value', value: 8_150_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/credit', asOf: RWA_OBSERVATION_DAY, scope: '信贷分类公开页人工观察；Distributed Value 独立口径。' },
      { id: 'rwa-xyz-credit-represented', label: 'RWA.xyz 信贷 Represented Value', value: 37_780_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/credit', asOf: RWA_OBSERVATION_DAY, scope: '信贷分类公开页人工观察；Represented Value 独立口径，不能与 Distributed 混称为可流通规模。' },
      { id: 'rwa-xyz-equities-distributed', label: 'RWA.xyz 权益 Distributed Value', value: 3_410_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/stocks', asOf: RWA_OBSERVATION_DAY, scope: '权益分类公开页人工观察；Distributed Value 独立口径。' },
      { id: 'rwa-xyz-equities-represented', label: 'RWA.xyz 权益 Represented Value', value: 23_910_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/stocks', asOf: RWA_OBSERVATION_DAY, scope: '权益分类公开页人工观察；Represented Value 独立口径，不能与 Distributed 混称为可流通规模。' },
      { id: 'rwa-xyz-commodities-distributed', label: 'RWA.xyz 商品 Distributed Value', value: 5_240_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/commodities', asOf: RWA_OBSERVATION_DAY, scope: '商品分类公开页人工观察；Distributed Value 独立口径。' },
      { id: 'rwa-xyz-commodities-represented', label: 'RWA.xyz 商品 Represented Value', value: 3_220_000_000, unit: 'USD', sourceUrl: 'https://app.rwa.xyz/commodities', asOf: RWA_OBSERVATION_DAY, scope: '商品分类公开页人工观察；Represented Value 独立口径，不能与 Distributed 混称为可流通规模。' },
    ]),
    access: [
      { source: 'DefiLlama', status: 'public-read', note: '刷新器只调用无需认证的公开端点。', url: 'https://defillama.com/docs/api' },
      { source: 'RWA.xyz', status: 'manual-public-page-only', note: '未调用 RWA.xyz API；仅录入已核对时间和口径的公开页面人工观察。', url: 'https://app.rwa.xyz/' },
      { source: 'x402scan', status: 'paid-awaiting-authorization', note: '公开文档显示数据端点需要付费；刷新器不会请求。', url: 'https://www.x402scan.com/docs' },
    ],
    update: { collector: 'scripts/refresh-landscape.mjs', allowlistedSources: Object.values(SOURCES), lastSuccessAt: ISO, limitations: ['未使用付费端点或 API 密钥。', '历史序列保留来源日期，缺口不插值。', 'RWA.xyz 仅录入公开首页人工观察，未调用其数据 API。'] },
  };
}

async function buildAgents() {
  // Manual public-page observation. The collector deliberately does not query x402scan's paid API.
  // These counters describe x402scan's indexed coverage, not verified humans or autonomous agents.
  const x402Observation = {
    asOf: '2026-10-18',
    observedAt: '2026-10-18T09:06:11.570Z',
    transactions: 2_987_237,
    uniqueBuyers: 36_578,
    uniqueSellers: 38_657,
  };
  const registry = await readFile(resolve(ROOT, 'src/data/ecosystem.ts'), 'utf8');
  const catalogCount = (registry.match(/pages: \[[^\]]*'agents'/g) || []).length;
  return {
    schemaVersion: 1,
    asOf: DAY,
    observedAt: x402Observation.observedAt,
    metrics: [
      { id: 'x402-indexed-transactions-cumulative', label: 'x402scan 索引累计交易', value: x402Observation.transactions, unit: 'transactions', change7d: null, sourceUrl: 'https://www.x402scan.com/', asOf: x402Observation.asOf, scope: 'x402scan 公开首页可见的累计计数，覆盖范围由该浏览器定义。', note: '不是代理专属成交额、独立用户数、结算额或收入。' },
      { id: 'x402-indexed-unique-buyers-cumulative', label: 'x402scan 索引独立买方', value: x402Observation.uniqueBuyers, unit: 'addresses', change7d: null, sourceUrl: 'https://www.x402scan.com/', asOf: x402Observation.asOf, scope: '浏览器报告的累计独立买方；地址身份和覆盖范围均由来源定义。', note: '地址不是已验证的人或自主代理。' },
      { id: 'x402-indexed-unique-sellers-cumulative', label: 'x402scan 索引独立卖方', value: x402Observation.uniqueSellers, unit: 'addresses', change7d: null, sourceUrl: 'https://www.x402scan.com/', asOf: x402Observation.asOf, scope: '浏览器报告的累计独立卖方；地址身份和覆盖范围均由来源定义。', note: '地址不是已验证的企业或自主代理。' },
      { id: 'agent-capability-catalog-count', label: '已核验代理能力实体', value: catalogCount, unit: 'entities', change7d: null, sourceUrl: '/data/agents/current.json', asOf: DAY, scope: '本地 ecosystem 注册表中 pages 包含 agents 的实体数。', note: '这是目录覆盖数，不是采用量、用户数或交易量。' },
    ],
    series: {},
    seriesMeta: {},
    breakdowns: [],
    access: [
      { source: 'x402scan 公开首页', status: 'manual-public-observation', note: '已录入带日期的首页计数人工观察；未调用付费端点，后续刷新会保留这项基线直至人工复核。', url: 'https://www.x402scan.com/' },
      { source: 'x402scan API', status: 'paid-awaiting-authorization', note: '仅查阅文档；未获付费授权，因此不调用数据端点。', url: 'https://www.x402scan.com/docs' },
      { source: 'OKX Agentic Wallet', status: 'official-capability', note: '能力证据见 ecosystem 注册表，不从能力文档推断采用量。', url: 'https://www.okx.com/en-us/learn/agentic-wallet' },
      { source: 'Coinbase AI Agents', status: 'official-capability', note: '能力证据见 ecosystem 注册表，不从能力文档推断采用量。', url: 'https://docs.cdp.coinbase.com/ai-agents/overview' },
    ],
    update: { collector: 'scripts/refresh-landscape.mjs', allowlistedSources: [], lastSourceObservationAt: x402Observation.observedAt, lastLocalRefreshAt: ISO, limitations: ['未使用付费端点或 API 密钥。', 'x402scan 数值是带日期的公开页面人工基线，自动刷新不会伪装成重新采集。', '没有方法可核验的当前公开值时，不输出代理采用量。'] },
  };
}

async function writeJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}

async function retainLastValid(file, task) {
  try {
    const data = await task();
    await writeJson(file, data);
    return data;
  } catch (error) {
    try {
      JSON.parse(await readFile(file, 'utf8'));
      console.warn(`Refresh failed; retaining last valid ${file}: ${error.message}`);
      return null;
    } catch {
      throw error;
    }
  }
}

const [tvlRows, stablecoins, stablecoinHistory, dex] = await Promise.all(Object.values(SOURCES).map(fetchJson));
const finance = buildFinance({ tvlRows, stablecoins, stablecoinHistory, dex });
const agents = await buildAgents();
for (const [section, data] of [['finance', finance], ['agents', agents]]) {
  const base = resolve(ROOT, 'public', 'data', section);
  await retainLastValid(resolve(base, 'current.json'), async () => data);
  await writeJson(resolve(base, 'snapshots', `${DAY}.json`), data);
}
console.log(`Landscape snapshots refreshed for ${DAY}: ${finance.metrics.length} finance metrics, ${agents.metrics.length} agent metrics.`);
