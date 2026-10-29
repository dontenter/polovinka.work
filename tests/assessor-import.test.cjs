const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require(name) { if (name in imports) return imports[name]; throw Error(name); }, URL, Buffer, AbortSignal, Date, ...extra });
  return exports;
}
const ids = load('lib/assessor-id.ts', {});
const card = id => `<a class="card" href="/play/${id}" data-site-id="${id}"><span class="card__title">Game &amp; title</span><time datetime="2026-10-23T10:00:00Z"></time></a>`;
const nextLink = page => `<a data-game-next href="/play?cursor=${Buffer.from(JSON.stringify({page,publishedAt:'2026-10-23T10:00:00Z'})).toString('base64url')}">More</a>`;
function importer(store, fetch) {
  return load('lib/assessor-import.ts', { 'server-only': {}, '@/lib/assessor-id': ids, '@/lib/assessor-storage': store }, { fetch });
}

test('legacy and current IDs import and launch; invalid IDs and foreign launch hosts are rejected', async () => {
  let saved, inserted;
  const impl = importer({ getSyncState: async () => null, insertGames: async games => { inserted=games; return games.length; }, saveSyncState: async state => {saved=state;} }, async url => new Response(url.endsWith('/play') ? card('abcdefgh01')+card('j46ohwmlic5whq') : '<iframe class="game-frame" data-game-url="https://sb-j46ohwmlic5whq.games.playgama.net/?csp=sandbox"></iframe>'));
  const result = await impl.syncAssessorGames('claim', '2026-10-09T10:00:00Z');
  assert.equal(result.added, 2);assert.equal(saved.newest_id,'abcdefgh01');assert.equal(inserted[1].id,'j46ohwmlic5whq');
  assert.equal(await impl.resolveLaunchUrl('j46ohwmlic5whq'),'https://sb-j46ohwmlic5whq.games.playgama.net/');
  for(const id of ['bad','a'.repeat(11),'a'.repeat(15),'../example']) assert.equal(ids.isAssessorGameId(id),false);
  await assert.rejects(impl.resolveLaunchUrl('../example'),/Invalid game ID/);
  const foreign = importer({}, async () => new Response('<iframe class="game-frame" src="https://example.com/"></iframe>'));
  await assert.rejects(foreign.resolveLaunchUrl('abcdefgh01'),/Unexpected game frame URL/);
});

test('deleted checkpoint falls back to records from the last successful sync, not partial inserts', async () => {
  let saved;const before='2026-10-09T10:00:00Z';let requested=0;
  const impl=importer({
    getSyncState: async()=>({newest_id:'abcdefgh01',backfill_cursor:null}),
    hasPreviouslyImportedGame: async (gameIds,cutoff)=>{assert.equal(cutoff,before);return gameIds.includes('game0000000002');},
    insertGames: async games=>games.length,
    saveSyncState: async state=>{saved=state;},
  }, async()=>{requested++;return new Response(card('game'+String(requested).padStart(10,'0')).replace('2026-10-23T10:00:00Z','2026-10-08T10:00:00Z')+nextLink(requested+1));});
  assert.equal((await impl.syncAssessorGames('claim',before)).backfillDone,true);
  assert.equal(requested,2);assert.equal(saved.newest_id,'game0000000001');assert.equal(saved.backfill_cursor,null);
});

test('more than 25 pages save a continuation and resume without skipping new arrivals',async()=>{
 let state={newest_id:'abcdefgh01',backfill_cursor:null};let requested=[];const before='2026-10-09T10:00:00Z';
 const impl=importer({getSyncState:async()=>state,hasPreviouslyImportedGame:async()=>false,insertGames:async games=>games.length,saveSyncState:async saved=>{state=saved;}},async url=>{
  const cursor=new URL(url).searchParams.get('cursor');const page=cursor?JSON.parse(Buffer.from(cursor,'base64url').toString()).page:1;requested.push(page);
  return new Response(card('game'+String(page).padStart(10,'0'))+(page<26?nextLink(page+1):''));
 });
 const first=await impl.syncAssessorGames('claim',before);assert.equal(first.backfillDone,false);assert.equal(requested.length,25);assert.equal(state.newest_id,'abcdefgh01');assert.equal(JSON.parse(state.backfill_cursor).knownBefore,before);
 const second=await impl.syncAssessorGames('next-claim','2026-10-23T11:00:00Z');assert.equal(second.backfillDone,true);assert.equal(requested.at(-1),26);assert.equal(state.newest_id,'game0000000001');assert.equal(state.backfill_cursor,null);
});

test('unrecognized catalog and unsafe continuation do not advance the checkpoint',async()=>{
 let saved=false,requested=false;const impl=importer({getSyncState:async()=>null,saveSyncState:async()=>{saved=true;}},async()=>new Response('<html>Unavailable</html>'));
 await assert.rejects(impl.syncAssessorGames('claim','2026-10-09T10:00:00Z'),/cards were not found/);assert.equal(saved,false);
 const unsafe=importer({getSyncState:async()=>({backfill_cursor:JSON.stringify({url:'https://example.com/play?cursor=x',newestId:'abcdefgh01',knownBefore:'2026-10-09T10:00:00Z'})})},async()=>{requested=true;});
 await assert.rejects(unsafe.syncAssessorGames('claim','2026-10-09T10:00:00Z'),/Unexpected catalog pagination URL/);assert.equal(requested,false);
});

 test('republished old IDs with fresh dates do not end the scan early', async()=>{
 let requested=0,saved;const impl=importer({getSyncState:async()=>({newest_id:'abcdefgh01',backfill_cursor:null}),hasPreviouslyImportedGame:async ids=>{assert.equal(ids.length,0);return false;},insertGames:async games=>games.length,saveSyncState:async value=>{saved=value;}},async()=>{requested++;return new Response(requested===1?card('abcdefgh01')+nextLink(2):card('j46ohwmlic5whq'));});
 const result=await impl.syncAssessorGames('claim','2026-10-09T11:10:49Z');assert.equal(result.added,2);assert.equal(requested,2);assert.equal(saved.backfill_done,true);
});
