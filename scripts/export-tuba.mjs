/** Export only the Tuba landing page and its referenced assets for standalone hosting. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const outputRoot = resolve('/Users/jarvi/tuba-labs');
const receiptRoot = resolve(projectRoot, 'outputs/tuba-vercel-release-20261019');
const origin = 'https://tuba-labs.vercel.app';
const source = await readFile(resolve(projectRoot, 'dist/tuba-labs/index.html'), 'utf8');
assert.ok(!source.includes('data-motion-toggle'), 'Build contains an obsolete animation control');
assert.ok(source.includes('href="https://jvyin.com"'), 'Personal profile must link to jvyin.com');
let html = source
  .replace('<meta name="robots" content="noindex, nofollow">', '')
  .replace('<link rel="canonical" href="https://jvyin.com/tuba-labs/">', '<link rel="canonical" href="' + origin + '/">')
  .replace('</head>', '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta property="og:title" content="Tuba Labs — Research. Build. Invest."><meta property="og:description" content="AI agent-driven. On-chain."><meta property="og:type" content="website"><meta property="og:url" content="' + origin + '/"></head>');
assert.ok(!html.includes('noindex') && !html.includes('https://jvyin.com/tuba-labs/'));
const assets = [...new Set([...html.matchAll(/(?:href|src)="(\/_astro\/[^"]+)"/g)].map(match => match[1]))];
assert.equal(assets.length, 2, 'Expected the global and Tuba stylesheets; Astro inlines the small motion module');
assert.ok(html.includes('<script type="module">') && html.includes('setTimeout'), 'Motion runtime is missing');
const output = new Map([['index.html', Buffer.from(html)]]);
for (const asset of assets) {
  assert.ok(!asset.includes('..'));
  output.set(asset.slice(1), await readFile(resolve(projectRoot, 'dist', asset.slice(1))));
}
output.set('favicon.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#fff"/><path d="M6 8h20v4h-8v14h-4V12H6z" fill="#202020"/><path d="M23 3h6v6h-6z" fill="#f37022"/></svg>'));
output.set('robots.txt', Buffer.from('User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n'));
output.set('sitemap.xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + origin + '/</loc></url></urlset>'));
output.set('vercel.json', Buffer.from(JSON.stringify({ cleanUrls: true }, null, 2) + '\n'));
await mkdir(outputRoot, { recursive: true });
const manifest = [];
const files = [];
for (const [file, bytes] of output) {
  const target = resolve(outputRoot, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  manifest.push({ file, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  files.push({ file, data: bytes.toString('base64'), encoding: 'base64' });
}
await writeFile(resolve(receiptRoot, 'release-manifest.json'), JSON.stringify({ origin, outputRoot, files: manifest }, null, 2) + '\n');
await writeFile(resolve(receiptRoot, 'deployment-files.json'), JSON.stringify(files) + '\n');
console.log(JSON.stringify({ outputRoot, origin, files: manifest }, null, 2));
