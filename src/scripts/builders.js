
const API = "https://api.llama.fi/overview/fees/hyperliquid?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true";
const SNAPSHOT = "/research/hyperliquid-builders-data.json";
const ADAPTER = "https://github.com/DefiLlama/dimension-adapters/blob/master/factory/hyperliquid.ts";
const WINDOWS = [{ id: "total30d", label: "30 天" }, { id: "total7d", label: "7 天" }, { id: "total24h", label: "24 小时" }, { id: "totalAllTime", label: "累计" }];
const WATCH = [
  { name: "Phantom", slug: "phantom-perps", module: "phantom-perps", rate: "5 bps", base: 5, detail: "官方普通费率 0.05%；样本中也出现更高档位。HIP-3、订单类型和账户档位可能不同。", source: "https://help.phantom.com/articles/42292249388307" },
  { name: "MetaMask", slug: "metamask-perps", module: "metamask-perps", rate: "实测 10 bps", base: 10, detail: "10 月 17 日地址样本为 10 bps。官方发布的是含底层费用的 Rewards 分级总费率，不把该总费率误写成 builder fee。", source: "https://support.metamask.io/ja/trade/perps/how-to-trade-perps/" },
  { name: "Trust Wallet", slug: "trust-wallet-perps", module: "trust-wallet-perps", rate: "口径冲突", detail: "官方帮助页称不加收平台费；DefiLlama 归属地址的 10 月 17 日样本实测约 10 bps。地址归属来自适配器，冲突尚未解释，不以文档的 0 代替实测。", source: "https://support.trustwallet.com/en/articles/717145-how-to-use-perpetuals-trading-perps-in-trust-wallet" },
  { name: "fomo", slug: "fomo-perps", module: "fomo-social-trading-perps", rate: "5 bps", base: 5, detail: "官方条款为单次交易 0.05%，另付协议费。10 月 17 日样本包含 1 和 5 bps，所以加权实测低于公开基础费率。", source: "https://fomo.family/terms" },
  { name: "Based", slug: "basedapp-perps", module: "based-app", rate: "2.5 / 0.2 bps", base: 2.5, detail: "普通永续 2.5 bps；增长模式市场 0.2 bps；BASED 质押可减免，Diamond 档可免。费用先归 Based，部分再按联盟规则分配。", source: "https://basedapp.gitbook.io/docs/based/fees" },
  { name: "Dreamcash", slug: "dreamcash-interface", module: "dreamcash", rate: "固定费率待核验", detail: "这里仅列 Dreamcash Interface；Dreamcash Markets 是 HIP-3 市场，另行剔除。10 月 17 日成交样本包含 2 和 4.5 bps，不将单日样本当作固定报价。", source: "https://dreamcash.xyz/" },
  { name: "Dexari", slug: "dexari-perps", module: "dexari", rate: "1–10 bps", base: 10, detail: "官方平台永续费率按等级为 10 / 8 / 6 / 3 / 1 bps，另可能有 Hyperliquid 费用。样本仅 3 笔，约 10 bps，不代表全部账户。", source: "https://help.dexari.com/resources/fees" },
  { name: "Minara", slug: "minara-ai-perps", module: "minaraai-perps", rate: "待核验", detail: "适配器同时统计 Hyperliquid builder fee 和 Lighter partner fee。未完成同场所拆分，收取额不纳入可比总和；不能由合计费用反推固定费率。", source: "https://github.com/DefiLlama/dimension-adapters/blob/master/dexs/minaraai-perps.ts", mixed: true, addresses: ["0x5a3bc60b0a99a7f4fbf0d15554fa5fe88e7628c2"] },
  { name: "Okto", slug: "okto-wallet-perps", module: "okto-wallet", rate: "固定费率待核验", detail: "单日实测约 1.8 bps，但只读到两个归属地址中的一个，且仅 9 笔。不能推广为全部账户的费率。", source: ADAPTER },
  { name: "Supercexy", slug: "supercexy-perps", module: "supercexy", rate: "实测 1 bp", base: 1, detail: "10 月 17 日公开成交文件共 24 笔，约 1 bp；未核实当前统一公开费表。", source: ADAPTER },
  { name: "HyperSignals", slug: "hypersignals", module: "hypersignals", rate: "待核验", detail: "公开费率未核实，适配器方法说明还涉及 Extended。口径未拆清前不纳入总和；缺失不是 0 bps。", source: "https://defillama.com/protocol/hypersignals", mixed: true },
  { name: "UXUY", slug: "uxuy-perps", module: "uxuy-perps", rate: "历史费率待核验", detail: "10 月 17 日公开文件不可读，不等于未成交或费率为零。当前自建永续的费率及旧现货兑换费均不能替代历史 Hyperliquid builder 费率。", source: ADAPTER },
  { name: "Senpi", slug: "senpi-perps", module: "senpi-perps", rate: "2.5–5 bps", base: 5, detail: "官方基础 5 bps，忠诚等级最低 2.5 bps；推荐者分得 Senpi builder fee 的 25%，不是额外向交易者再加 25%。", source: "https://resources.senpi.ai/support/fees-and-loyalty-tiers" },
  { name: "pump.fun", slug: "pump-fun-perps-unverified", module: "pump-fun-perps-unverified", website: "https://pump.fun/", rate: "最高 10 bps", owner: "pump.fun", detail: "2026-10-17 官方费率页：永续 builder fee 最高 0.10%；另有最高 0.25% 的桥接转移费，不计入 builder fee。缺少可核实的独立收取额和 builder 地址，因此不并入排行，也不把上限写成每笔固定费率。", source: "https://pump.fun/docs/fees" }
];
const CASE_SERIES = [{ slug: "basedapp-perps", name: "Based" }, { slug: "fomo-perps", name: "fomo" }, { slug: "phantom-perps", name: "Phantom" }];
const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let rows = [], allRows = [], samples = [], websites = new Map(), windowId = "total30d", selectedSlug = "", watchFilter = "all", searchQuery = "", dataStamp = "", chartRequest = 0, chartController;
const num = (p, key) => typeof p?.[key] === "number" && Number.isFinite(p[key]) ? p[key] : null;
const labelOf = (p) => p.displayName || p.name;
const money = (n) => n == null || !Number.isFinite(n) ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: Math.abs(n) >= 1e3 ? "compact" : "standard", maximumFractionDigits: Math.abs(n) >= 1e6 || Math.abs(n) < 1 ? 2 : 0 }).format(n);
const usd = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const sumKey = (list, key) => list.reduce((sum, p) => sum + (num(p, key) ?? 0), 0);
const create = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};
function websiteOf(p) {
  try {
    const url = new URL(p.website || websites.get(p.slug));
    return ["https:", "http:"].includes(url.protocol) && !url.username ? url.href : null;
  } catch {
    return null;
  }
}
function websiteLink(p, className, text = labelOf(p)) {
  const url = websiteOf(p), link = create(url ? "a" : "span", text, className);
  if (url) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "官网：" + url;
    link.setAttribute("aria-label", labelOf(p) + " 官网（新标签页）");
  }
  return link;
}
function isComparable(p) {
  if (p.category !== "Interface") return false;
  const method = Object.values(p.methodology || {}).join(" ");
  if (/markets deployed|deployed by|HIP-3 markets|HIP-4|\bspot\b|\boutcome\b|Lighter|Extended/i.test(method)) return false;
  return /builder[ -]*code|builder (fees|revenue)|\bperps\b/i.test(method);
}
function statusOf(p) {
  const recent = num(p, "total30d"), all = num(p, "totalAllTime");
  if (recent == null || all == null) return { text: "数据不足", cls: "" };
  if (all > 2e4 && recent < 1e3) return { text: "近乎归零", cls: "dead" };
  if (all > 5e6 && recent < 1e5) return { text: "明显回落", cls: "fade" };
  if (recent >= 1e4) return { text: "仍在收取", cls: "live" };
  return { text: "收取较少", cls: "fade" };
}
function renderStats() {
  const measured = rows.filter((p) => num(p, "total30d") != null), by30 = [...measured].sort((a, b) => b.total30d - a.total30d), total = sumKey(measured, "total30d"), top = by30[0], five = sumKey(by30.slice(0, 5), "total30d");
  $("s-30").textContent = money(total);
  $("s-top").textContent = total ? Math.round(top.total30d / total * 100) + "%" : "—";
  $("s-top-label").textContent = top ? labelOf(top) + " · 30 天份额" : "第一名占比";
  $("s-five").textContent = total ? Math.round(five / total * 100) + "%" : "—";
  $("s-quiet").textContent = String(measured.filter((p) => num(p, "totalAllTime") > 2e4 && p.total30d < 1e3).length);
  $("share-line").textContent = total ? "同口径的前端过去 30 天收取 " + money(total) + "。前五名合计 " + Math.round(five / total * 100) + "%，" + (top ? labelOf(top) + " 占 " + Math.round(top.total30d / total * 100) + "%。" : "") : "当前数据不足，暂不计算份额。";
  $("cohort-note").textContent = "已剔除 HIP-3 市场部署收入、现货、HIP-4 及未拆清的跨场所项目；" + measured.length + " 项有 30 天数据，" + (rows.length - measured.length) + " 项该字段缺失。缺失不算 0。";
  $("share").replaceChildren();
  $("legend").replaceChildren();
  const parts = by30.slice(0, 5).map((p) => ({ name: labelOf(p), value: p.total30d }));
  parts.push({ name: "其他", value: Math.max(0, total - five) });
  parts.forEach((part, i) => {
    const seg = create("div", null, "share-seg"), color = i === 5 ? "var(--border)" : "color-mix(in srgb,var(--accent) " + (100 - i * 15) + "%,var(--paper))";
    seg.style.background = color;
    $("share").append(seg);
    requestAnimationFrame(() => seg.style.width = (total ? part.value / total * 100 : 0) + "%");
    const item = create("span"), sw = create("i", null, "swatch");
    sw.style.background = color;
    item.append(sw, part.name + " " + (total ? Math.round(part.value / total * 100) : 0) + "%");
    $("legend").append(item);
  });
}
function renderRanks() {
  const list = rows.filter((p) => num(p, windowId) != null).sort((a, b) => b[windowId] - a[windowId]).slice(0, 12), max = Math.max(...list.map((p) => p[windowId]), 1);
  $("ranks").replaceChildren();
  $("rank-line").textContent = "按" + WINDOWS.find((w) => w.id === windowId).label + "收取额排序 · 点击查看趋势，↗ 打开官网";
  for (const p of list) {
    const button = create("button", null, "bar-row" + (p.slug === selectedSlug ? " on" : ""));
    button.type = "button";
    button.setAttribute("aria-pressed", String(p.slug === selectedSlug));
    const track = create("span", null, "track"), fill = create("span", null, "fill"), name = create("span", labelOf(p), "name"), sample = samples.find((s) => s.module === p.module), fee = sample?.fills ? "实测 " + sample.weightedBps.toFixed(2) + " bps" : "附加费率待核验";
    name.append(create("small", fee, "rank-fee"));
    button.title = labelOf(p) + " 收取额；" + fee + "，2026-10-17 UTC 地址样本";
    track.append(fill);
    button.append(name, track, create("span", money(p[windowId]), "amt"));
    button.addEventListener("click", () => select(p));
    const entry = create("div", null, "rank-entry");
    entry.append(button);
    if (websiteOf(p)) entry.append(websiteLink(p, "rank-website", "↗"));
    $("ranks").append(entry);
    requestAnimationFrame(() => fill.style.width = Math.max(p[windowId] > 0 ? 1.5 : 0, p[windowId] / max * 100) + "%");
  }
}
async function fetchJSON(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function select(p) {
  const request = ++chartRequest;
  chartController?.abort();
  chartController = new AbortController();
  selectedSlug = p.slug;
  renderRanks();
  $("spark-wrap").hidden = false;
  $("spark-label").textContent = labelOf(p) + " · 正在读取 90 天日收取额…";
  $("spark").replaceChildren();
  $("spark").classList.add("chart-loading");
  try {
    const data = await fetchJSON("https://api.llama.fi/summary/fees/" + encodeURIComponent(p.slug) + "?dataType=dailyFees", AbortSignal.any([chartController.signal, AbortSignal.timeout(16e3)]));
    if (request !== chartRequest) return;
    const series = (data.totalDataChart || []).filter((d) => Number.isFinite(Number(d[1]))).slice(-90);
    $("spark-label").textContent = labelOf(p) + " · " + (series.length ? "最近 " + series.length + " 个有数据的日点" : "暂无可用日数据");
    $("spark").setAttribute("aria-label", labelOf(p) + " 最近 90 天每日前端收取额");
    drawChart($("spark"), [{ name: labelOf(p), points: series }], 640, 150);
  } catch (error) {
    if (request !== chartRequest || error.name === "AbortError") return;
    $("spark-label").textContent = labelOf(p) + " · 趋势暂时不可用（" + error.message + "），可重新点击此行。";
  } finally {
    if (request === chartRequest) $("spark").classList.remove("chart-loading");
  }
}
function drawChart(svg, packs, width, height) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const ns = "http://www.w3.org/2000/svg", all = packs.flatMap((p) => p.points), dates = [...new Set(all.map((p) => p[0]))].sort((a, b) => a - b), max = Math.max(...all.map((p) => p[1]), 1);
  if (!dates.length) return;
  const make = (tag, attrs, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    svg.append(node);
    return node;
  };
  const x = (timestamp) => 46 + dates.indexOf(timestamp) / Math.max(dates.length - 1, 1) * (width - 62), y = (value) => 12 + (1 - value / max) * (height - 42);
  for (let i = 0; i < 3; i++) {
    const value = max * i / 2;
    make("line", { x1: 46, x2: width - 12, y1: y(value), y2: y(value), stroke: "var(--border)", "stroke-width": 1 });
    make("text", { x: 1, y: y(value) + 4, fill: "var(--muted)", "font-size": 10 }, money(value));
  }
  const dashes = ["", "7 4", "2 4"];
  packs.forEach((pack, i) => {
    const path = make("path", { d: pack.points.map((point, index) => (index ? "L" : "M") + x(point[0]).toFixed(1) + " " + y(point[1]).toFixed(1)).join(" "), fill: "none", stroke: "currentColor", "stroke-width": i === 0 ? 2.3 : 1.8, "stroke-dasharray": dashes[i % 3], opacity: 1 - i * 0.2 });
    if (!reducedMotion.matches) path.animate([{ opacity: 0 }, { opacity: 1 - i * 0.2 }], { duration: 650, fill: "both" });
  });
  [dates[0], dates.at(-1)].forEach((timestamp, i) => make("text", { x: i ? width - 12 : 46, y: height - 3, fill: "var(--muted)", "font-size": 10, "text-anchor": i ? "end" : "start" }, new Date(timestamp * 1e3).toISOString().slice(0, 10)));
}
async function drawCases() {
  const results = await Promise.allSettled(CASE_SERIES.map(async (item) => {
    const data = await fetchJSON("https://api.llama.fi/summary/fees/" + item.slug + "?dataType=dailyFees", AbortSignal.timeout(16e3)), months = /* @__PURE__ */ new Map();
    for (const [time, value] of data.totalDataChart || []) {
      if (!Number.isFinite(Number(value))) continue;
      const date = new Date(Number(time) * (Number(time) > 1e12 ? 1 : 1e3)), key = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1e3;
      months.set(key, (months.get(key) || 0) + Number(value));
    }
    return { ...item, points: [...months].sort((a, b) => a[0] - b[0]).slice(-14) };
  }));
  const packs = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  drawChart($("cases"), packs, 800, 250);
  $("case-legend").replaceChildren();
  packs.forEach((pack, i) => $("case-legend").append(create("span", pack.name + [" · 实线", " · 长虚线", " · 点线"][i])));
  $("case-note").textContent = packs.length ? "按 UTC 月汇总，当前月尚未结束。仅比较前端收取额；trade.xyz 市场费用已移出。" + (packs.length < 3 ? " 部分曲线未返回，暂不展示。" : "") : "月度数据暂不可用，正文和费率表仍可阅读。";
}
function renderWatch() {
  const body = $("watch");
  body.replaceChildren();
  let count = 0;
  const others = [...rows].filter((p) => num(p, "total30d") != null).sort((a, b) => b.total30d - a.total30d).slice(0, 12).filter((p) => !WATCH.some((item) => item.slug === p.slug)).map((p) => ({ name: labelOf(p), slug: p.slug, module: p.module, rate: "固定费率待核验", detail: "列出排行中的前端。实测值来自 2026-10-17 UTC 对应 builder 地址的公开成交样本，不是统一费表；无样本不等于 0。", source: ADAPTER }));
  const projects = [...WATCH, ...others];
  for (const item of projects) {
    const p = allRows.find((row) => row.slug === item.slug), sample = samples.find((s) => s.module === item.module), status = item.mixed ? { text: "口径待拆分", cls: "fade" } : statusOf(p);
    if (searchQuery && !`${item.name} ${item.rate} ${item.detail}`.toLowerCase().includes(searchQuery)) continue;
    if (watchFilter === "known" && !sample?.fills) continue;
    if (watchFilter === "low" && status.cls !== "dead" && status.cls !== "fade") continue;
    count++;
    const tr = create("tr"), name = create("td"), owner = create("td"), rate = create("td"), observed = create("td"), recent = create("td"), all = create("td"), state = create("td");
    name.append(websiteLink(item, "project-name project-link"));
    const chartButton = create("button", "查看趋势 ↗", "filter-button");
    chartButton.type = "button";
    chartButton.style.cssText = "display:block;margin-top:.5rem;font-size:.65rem;padding:.2rem .45rem";
    chartButton.disabled = !p || item.mixed;
    chartButton.addEventListener("click", () => {
      select(p);
      $("spark-wrap").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "center" });
    });
    name.append(chartButton);
    owner.append(create("span", item.owner || item.name + " 对应 builder 地址"), create("span", item.owner ? "收取方来自官方费率说明；地址尚未核实。" : "归属依据：DefiLlama 适配器；不等于已确认最终法人或分账。", "table-sub"));
    rate.append(create("span", item.rate, "rate" + (/待核验|冲突/.test(item.rate) ? " unknown" : "")));
    const details = create("details", null, "fee-detail");
    details.append(create("summary", "条件、出处与地址"), create("p", item.detail));
    const doc = create("a", "公开说明 ↗");
    doc.href = item.source;
    doc.target = "_blank";
    doc.rel = "noopener noreferrer";
    details.append(doc);
    for (const address of sample?.addresses || item.addresses || []) {
      details.append(create("code", address));
    }
    rate.append(details);
    if (sample?.fills) {
      const link = create("a", sample.weightedBps.toFixed(2) + " bps", "rate");
      link.href = sample.sources[0];
      link.title = "Hyperliquid 官方公开成交文件";
      observed.append(link, create("span", sample.fills.toLocaleString() + " 笔" + (sample.errors.length ? " · 部分地址缺失" : ""), "table-sub"));
    } else observed.append(create("span", "无可用样本", "table-sub"));
    recent.textContent = item.mixed ? "未纳入合计" : money(num(p, "total30d"));
    all.textContent = item.mixed ? "未纳入合计" : money(num(p, "totalAllTime"));
    state.append(create("span", status.text, "tag " + status.cls));
    tr.append(name, owner, rate, observed, recent, all, state);
    body.append(tr);
  }
  if (!count) {
    const row = create("tr"), cell = create("td", "没有匹配的前端，试试清空搜索或切换筛选。", "empty");
    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
  }
  $("table-count").textContent = count + " / " + projects.length + " 个前端";
}
function renderAll() {
  renderStats();
  renderRanks();
  renderWatch();
}
async function refresh() {
  $("refresh").disabled = true;
  $("err").hidden = true;
  try {
    const data = await fetchJSON(API, AbortSignal.timeout(15e3));
    if (!Array.isArray(data.protocols) || !data.protocols.length) throw new Error("数据列表为空");
    const nextAll = data.protocols.filter((p) => p.category === "Interface"), nextRows = nextAll.filter(isComparable);
    if (!nextRows.length) throw new Error("没有可比数据");
    allRows = nextAll;
    rows = nextRows;
    dataStamp = "DefiLlama · 抓取 " + (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { hour12: false }) + " · " + rows.length + " 个同口径前端";
    $("stamp").textContent = dataStamp;
    renderAll();
  } catch (error) {
    $("stamp").textContent = dataStamp ? dataStamp + " · 实时刷新失败" : "公开费用暂不可用";
    $("err").hidden = false;
    $("err").textContent = (rows.length ? "实时刷新失败，保留上述日期的数据。" : "收取额暂不可用；公开费率与已核验样本仍可阅读。") + "（" + error.message + "）";
  } finally {
    $("refresh").disabled = false;
  }
}
function setup() {
  WINDOWS.forEach((w) => {
    const button = create("button", w.label, w.id === windowId ? "on" : "");
    button.type = "button";
    button.setAttribute("aria-pressed", String(w.id === windowId));
    button.addEventListener("click", () => {
      windowId = w.id;
      $("windows").querySelectorAll("button").forEach((b) => {
        b.classList.toggle("on", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      renderRanks();
    });
    $("windows").append(button);
  });
  $("fee-search").addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderWatch();
  });
  document.querySelectorAll("[data-watch-filter]").forEach((button) => button.addEventListener("click", () => {
    watchFilter = button.dataset.watchFilter;
    document.querySelectorAll("[data-watch-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    renderWatch();
  }));
  $("refresh").addEventListener("click", refresh);
  const updateCost = () => {
    const size = Number($("order-size").value), bps = Number($("fee-bps").value), base = size * 4.5 / 1e4, extra = size * bps / 1e4;
    $("order-output").value = money(size);
    $("bps-output").value = bps.toFixed(1) + " bps";
    $("extra-cost").textContent = usd(extra);
    $("cost-explanation").textContent = "前端收取 " + usd(extra) + "；底层费用示例 " + usd(base) + "；单边合计 " + usd(base + extra) + "。同样规模开平两次，前端合计 " + usd(extra * 2) + "。";
    $("protocol-split").style.width = 4.5 / (4.5 + bps) * 100 + "%";
    $("builder-split").style.width = bps / (4.5 + bps) * 100 + "%";
  };
  $("order-size").addEventListener("input", updateCost);
  $("fee-bps").addEventListener("input", updateCost);
  updateCost();
  let scheduled = false;
  const updateProgress = () => {
    const height = document.documentElement.scrollHeight - innerHeight;
    $("reading-progress").style.transform = "scaleX(" + (height > 0 ? Math.min(1, Math.max(0, scrollY / height)) : 0) + ")";
    scheduled = false;
  };
  addEventListener("scroll", () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  updateProgress();
  if ("IntersectionObserver" in window) {
    document.querySelector(".builders-report").classList.add("motion-ready");
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        reveal.unobserve(entry.target);
      }
    }), { threshold: 0.06 });
    document.querySelectorAll(".case,.panel,.stats").forEach((node) => {
      node.classList.add("reveal");
      reveal.observe(node);
    });
    const nav = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) document.querySelectorAll(".toc a").forEach((link) => link.setAttribute("aria-current", String(link.hash === "#" + entry.target.id)));
    }), { rootMargin: "-10% 0px -65% 0px" });
    document.querySelectorAll("h2[id]").forEach((node) => nav.observe(node));
  }
  renderWatch();
}
async function init() {
  setup();
  try {
    const data = await fetchJSON(SNAPSHOT);
    samples = data.samples || [];
    allRows = data.protocols || [];
    websites = new Map(allRows.filter((p) => p.website).map((p) => [p.slug, p.website]));
    rows = allRows.filter(isComparable);
    dataStamp = "快照抓取 " + new Date(data.capturedAt).toLocaleString("zh-CN", { hour12: false });
    $("stamp").textContent = dataStamp + " · 正在刷新";
    renderAll();
  } catch {
    $("stamp").textContent = "正在读取公开数据…";
  }
  await refresh();
  drawCases();
}
init();
  