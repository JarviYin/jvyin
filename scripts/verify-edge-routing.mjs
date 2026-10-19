/** Validate the deployed route contract locally; no network or AWS mutation. */
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const template = await readFile('infra/site.yaml', 'utf8');
const block = template.split('FunctionCode: |\n')[1]?.split('\n  # ---------- CloudFront')[0];
assert.ok(block, 'CloudFront function code must be present');
const code = block.split('\n').map(line => line.replace(/^ {8}/u, '')).join('\n');
const handler = runInNewContext(`${code}\nhandler`, {}, { timeout: 1000 });
const request = (uri, host = 'jvyin.com', querystring = {}) => ({ request: { uri, method: 'GET', headers: { host: { value: host } }, querystring } });
const checks = [];

for (const route of ['', 'agents', 'onchain-finance', 'research', 'research/hyperliquid-builders', 'newsletter', 'products']) {
  const uri = `/${route}${route ? '/' : ''}`;
  assert.equal(handler(request(uri)).uri, `${uri}index.html`);
  checks.push(uri);
}
const issues = (await readdir('dist/newsletter', { withFileTypes: true })).filter(entry => entry.isDirectory() && /^\d+$/u.test(entry.name)).map(entry => entry.name);
assert.equal(issues.length, 9);
for (const id of issues) {
  for (const suffix of ['', '/']) assert.equal(handler(request(`/newsletter/${id}${suffix}`)).uri, `/newsletter/${id}/index.html`);
}
assert.equal(handler(request('/newsletter/010/')).uri, '/nl-issue/index.html', 'Keep the API shell for future admin-published issues');
for (const uri of ['/api/newsletters', '/api/subscribe', '/rss.xml', '/research/hyperliquid-builders.html', '/_astro/app.css']) assert.equal(handler(request(uri)).uri, uri);
const redirect = handler(request('/agents/', 'www.jvyin.com', { sector: { value: 'payments' }, sort: { value: 'name' } }));
assert.equal(redirect.statusCode, 301);
assert.equal(redirect.headers.location.value, 'https://jvyin.com/agents/?sector=payments&sort=name');

const result = { result: 'pass', scope: 'Local routing contract; not live CDN/browser execution', directoryRoutes: checks, staticIssues: issues.sort(), dynamicFallback: '010', apiAndAssetPaths: 'unchanged', wwwRedirect: 'pass' };
await writeFile('outputs/release-20261018/routing-qa.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
