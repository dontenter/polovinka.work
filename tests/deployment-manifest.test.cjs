const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('website deployments preserve the Brazil portal and existing services', () => {
  for (const file of ['app/life/page.tsx', 'app/life/brazil/page.tsx', 'app/life/brazil/chat/page.tsx', 'app/api/life/brazil/chat/route.ts', 'app/api/cron/brazil/route.ts', 'app/api/cron/assessor-telegram/route.ts', 'app/life/telegram/page.tsx']) {
    assert.ok(fs.existsSync(file), 'Missing production feature: ' + file);
  }
  assert.ok(fs.readFileSync('app/life/page.tsx', 'utf8').includes('href="/life/brazil"'));
  const crons = JSON.parse(fs.readFileSync('vercel.json')).crons;
  assert.ok(crons.some(c => c.path === '/api/cron/brazil' && c.schedule === '17,32,47 3 * * *'));
  assert.ok(crons.some(c => c.path === '/api/cron/assessor-telegram' && c.schedule === '*/5 * * * *'));
  assert.equal(crons.some(c => c.path === '/api/cron/intercom' || c.path === '/api/cron/telegram'), false, 'Do not reactivate migrated or disabled jobs');
});
