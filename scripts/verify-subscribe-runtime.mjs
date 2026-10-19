/** Exercise the actual generated inline script in a VM. No network or emails. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html = await readFile('dist/index.html', 'utf8');
const code = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(script => script.includes("getElementById('subscribe-form')"));
assert.ok(code, 'Expected actual inline subscription script');
let handler, resets = 0, requests = 0;
let fields = { email: '', hp_x7q2: '' };
let response = { ok: true, json: async () => ({ ok: true, message: 'Test-only confirmation' }) };
const button = { disabled: false };
const msg = { className: '', textContent: '' };
const form = { querySelector: () => button, addEventListener: (name, fn) => { assert.equal(name, 'submit'); handler = fn; }, reset: () => { resets++; } };
runInNewContext(code, {
  document: { getElementById: id => id === 'subscribe-form' ? form : msg },
  FormData: class { get(key) { return fields[key]; } },
  fetch: async () => { requests++; return response; },
});
assert.equal(typeof handler, 'function', 'Inline code must parse and mount');
await handler({ preventDefault() {} });
assert.equal(requests, 0, 'Empty fields must not send');
fields = { email: 'isolated-test@example.invalid', hp_x7q2: '' };
await handler({ preventDefault() {} });
assert.equal(requests, 1);
assert.equal(resets, 1);
assert.equal(button.disabled, false);
assert.equal(msg.textContent, '✅ Test-only confirmation');
response = { ok: false, json: async () => ({ ok: false, message: 'Simulated failure' }) };
await handler({ preventDefault() {} });
assert.equal(requests, 2);
assert.equal(button.disabled, false);
assert.equal(msg.className, 'form-msg err');
assert.ok(msg.textContent.includes('Simulated failure'));
assert.equal(resets, 1, 'Failed submissions retain input for retry');
console.log('PASS: actual inline subscription parses, mounts, and handles empty/success/failure states with a mocked fetch. No external requests.');
