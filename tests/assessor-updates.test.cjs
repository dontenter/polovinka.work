const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(rows = [{ id: 'abcdefgh01' }], dbStatus = 200, authorized = true) {
  const calls = [];
  function load(file, imports, extra = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, require(name) {
      if (name in imports) return imports[name];
      throw Error(name);
    }, URLSearchParams, AbortSignal, Date, console: { error() {} }, ...extra });
    return exports;
  }
  const store = load('lib/assessor-storage.ts', { 'server-only': {} }, {
    process: { env: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' } },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(rows), { status: dbStatus });
    },
  });
  const route = load('app/api/lab/assessor/[id]/route.ts', {
    'next/server': { after: () => {}, NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/assessor-auth': { assessorAuthorized: async () => authorized },
    '@/lib/assessor-storage': store,
    '@/lib/assessor-id': { isAssessorGameId: value => /^(?:[a-z0-9]{10}|[a-z0-9]{14})$/.test(value) },
  });
  return { calls, patch: body => route.PATCH({ json: async () => body }, { params: Promise.resolve({ id: 'abcdefgh01' }) }) };
}

test('quality marks save in one database round trip and clear the opposite mark atomically', async () => {
  for (const [key, expected] of [
    ['favourite', { is_favourite: true, is_ai_slop: false }],
    ['aiSlop', { is_ai_slop: true, is_favourite: false }],
  ]) {
    const { calls, patch } = setup();
    assert.equal((await patch({ [key]: true })).status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.method, 'PATCH');
    assert.equal(calls[0].init.headers.Prefer, 'return=representation');
    assert.equal(new URL(calls[0].url).searchParams.get('select'), 'id');
    assert.deepEqual(JSON.parse(calls[0].init.body), expected);
  }
});

test('one update detects missing games for both quality and content decisions', async () => {
  for (const body of [{ favourite: false }, { aiSlop: true }, { status: 'clear' }]) {
    const { calls, patch } = setup([]);
    assert.equal((await patch(body)).status, 404);
    assert.equal(calls.length, 1);
  }
});

test('database errors do not acknowledge a saved mark; invalid and unauthorized requests never access storage', async () => {
  const failed = setup({}, 500);
  assert.equal((await failed.patch({ favourite: true })).status, 500);
  const invalid = setup();
  assert.equal((await invalid.patch({ favourite: true, aiSlop: true })).status, 400);
  assert.equal(invalid.calls.length, 0);
  const unauthorized = setup([], 200, false);
  assert.equal((await unauthorized.patch({ favourite: true })).status, 401);
  assert.equal(unauthorized.calls.length, 0);
});
