const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto, createHmac } = require('node:crypto');
function load(file, env = {}, fetch = global.fetch) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) { if (name === 'server-only') return {}; throw Error(name); },
    process: { env }, fetch, AbortSignal, crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob, Uint8Array, ArrayBuffer, Date, URL, console });
  return exports;
}
test('Life session rejects Lab tokens, missing/future/expired timestamps and tampering', async () => {
  const life = load('lib/auth-life.ts');
  const lab = load('lib/auth-lab.ts');
  const secret = 'test-only-secret';
  const good = await life.createLifeSession(secret);
  assert.equal(await life.verifyLifeSession(secret, good), true);
  assert.equal(await life.verifyLifeSession(secret, await lab.createLabSession(secret)), false);
  assert.equal(await life.verifyLifeSession('another-secret', good), false);
  for (const obj of [{ scope: 'life' }, { scope: 'life', t: Date.now()+60000 }, { scope: 'life', t: Date.now()-8*86400000 }]) {
    const payload = JSON.stringify(obj);
    const token = Buffer.from(payload).toString('base64url')+'.'+createHmac('sha256', secret).update(payload).digest('base64url');
    assert.equal(await life.verifyLifeSession(secret, token), false);
  }
});
test('Supabase archive uses secret header and descending keyset pagination without caching', async () => {
  const calls = [];
  const rows = Array.from({length: 31}, (_, i) => ({ id: `20260930T0000${String(59-i).padStart(2,'0')}Z` }));
  const store = load('lib/life-storage.ts', { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' }, async (url, init) => {
    calls.push({url, init}); return new Response(JSON.stringify(rows), {status: 200});
  });
  const page = await store.listDigests();
  assert.equal(page.items.length, 30);
  assert.equal(page.cursor, rows[29].id);
  await store.listDigests(page.cursor);
  assert.ok(calls[1].url.includes('&id=lt.'+page.cursor));
  assert.ok(calls[0].url.includes('order=id.desc'));
  assert.equal(calls[0].init.cache, 'no-store');
  assert.equal(calls[0].init.headers.apikey, 'sb_secret_test');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  await assert.rejects(store.listDigests('invalid&select=*'));
});
test('Digest validation and duplicate insert failure are not silently ignored', async () => {
  const store = load('lib/life-storage.ts', { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'legacy' }, async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer legacy');
    assert.equal(init.method, 'POST');
    return new Response('{}', {status: 409});
  });
  const digest = { id:'20260930T000000Z', from:'2026-09-29T00:00:00Z', to:'2026-09-30T00:00:00Z', model:'gpt-5-mini', messageCount:5, markdown:'Test' };
  assert.throws(() => store.parseDigest({...digest, messageCount:-1}));
  await assert.rejects(store.storeDigest(digest), /409/);
});
test('Life origin check supports Next proxy URLs and blocks foreign origins', () => {
  const {lifeRequestOrigin}=load('lib/life-origin.ts');
  assert.equal(lifeRequestOrigin(new Headers({host:'127.0.0.1:3117',origin:'http://127.0.0.1:3117'})), 'http://127.0.0.1:3117');
  assert.equal(lifeRequestOrigin(new Headers({host:'www.polovinka.work',origin:'https://www.polovinka.work'})), 'https://www.polovinka.work');
  assert.equal(lifeRequestOrigin(new Headers({host:'www.polovinka.work',origin:'https://evil.example'})), null);
  assert.equal(lifeRequestOrigin(new Headers({host:'www.polovinka.work'})), null);
});
