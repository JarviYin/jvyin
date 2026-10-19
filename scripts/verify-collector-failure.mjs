import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Public research files only. The child process has fetch replaced before imports,
// so this check cannot reach any external endpoint or financial system.
const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['public/data/finance/current.json', 'public/data/agents/current.json'];
const digest = file => createHash('sha256').update(readFileSync(new URL(`../${file}`, import.meta.url))).digest('hex');
const before = files.map(digest);
const preloader = 'data:text/javascript,' + encodeURIComponent("globalThis.fetch = async () => { throw new Error('QA simulated source unavailability'); };");
const result = spawnSync(process.execPath, ['--import', preloader, 'scripts/refresh-landscape.mjs'], { cwd: root, encoding: 'utf8' });
assert.notEqual(result.status, 0, 'Unavailable sources must not report success');
assert.match(result.stderr, /QA simulated source unavailability/);
assert.deepEqual(files.map(digest), before, 'Collector failure changed last valid snapshots');
const receipt = { scope: 'isolated fetch failure, no external requests', status: 'pass', retainedFiles: files, hashes: before };
writeFileSync(new URL('../outputs/site-upgrade-20261018/collector-failure-qa.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
console.log('PASS: failed public-source collection preserves both last valid snapshots.');
