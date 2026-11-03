const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const core={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/brazil-knowledge-core.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:core,require,Date,Intl,Buffer,Set,Map});
test('Brazil yesterday crosses UTC midnight correctly and windows reject invalid days',()=>{
 assert.equal(core.yesterdayBrazil(new Date('2026-10-24T02:59:59Z')),'2026-10-22');
 assert.equal(core.yesterdayBrazil(new Date('2026-10-24T03:00:00Z')),'2026-10-23');
 assert.equal(core.brazilWindow('2026-10-23').from,'2026-10-23T03:00:00.000Z');
 assert.equal(core.brazilWindow('2026-10-23').to,'2026-10-24T03:00:00.000Z');
 assert.throws(()=>core.brazilWindow('2026-02-31'));
});
test('citations reject fabricated chats, IDs and unobserved links',()=>{
 assert.throws(()=>core.sourceUrl('another_chat',1));assert.throws(()=>core.parseSource('https://t.me/brfloripa/1?x=2'));
 const url=core.sourceUrl('brfloripa',42),source={id:42,date:'2026-10-23T12:00:00Z',url},allowed=new Map([[url,source]]);
 assert.equal(core.validateAnswer({text:'Участник сообщил о залоге.',source_urls:[url]},allowed).sources[0].id,42);
 assert.throws(()=>core.validateAnswer({text:'Факт',source_urls:['https://t.me/brfloripa/999']},allowed));
 assert.throws(()=>core.validateAnswer({text:'Неподтверждённый факт',source_urls:[]},allowed));
 assert.throws(()=>core.validateAnswer({text:'https://example.com',source_urls:[url]},allowed));
 assert.equal(core.validateAnswer({text:'В базе недостаточно сведений.',source_urls:[]},allowed).sources.length,0);
});
test('conservative reservation includes UTF-8 and maximum billed output',()=>{
 assert.ok(core.reservationBound({text:'я'.repeat(100)},100)>core.reservationBound({text:'a'.repeat(100)},100));
 assert.ok(core.reservationBound({},2000)>=2000*2/1e6);
});
function route(env,execute){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/cron/brazil/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){
  if(name==='node:crypto')return require(name);if(name==='next/server')return {NextResponse:{json:(v,o)=>new Response(JSON.stringify(v),o)}};
  if(name==='@/lib/brazil-knowledge-job')return {runBrazilDaily:execute};throw Error(name);
 },Buffer,process:{env},console:{error(){}}});return exports.GET;
}
test('cron never runs without its secret or in preview',async()=>{
 let calls=0;const run=async()=>{calls++;return {status:'complete'};};
 const request=secret=>new Request('https://example.com/api/cron/brazil',{headers:secret?{authorization:'Bearer '+secret}:{}});
 assert.equal((await route({CRON_SECRET:'test',VERCEL_ENV:'production'},run)(request())).status,401);
 assert.equal((await route({CRON_SECRET:'test',VERCEL_ENV:'production'},run)(request('wrong'))).status,401);
 await route({CRON_SECRET:'test',VERCEL_ENV:'preview'},run)(request('test'));assert.equal(calls,0);
 await route({CRON_SECRET:'test',VERCEL_ENV:'production'},run)(request('test'));assert.equal(calls,1);
});
function chatRoute(env,execute){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/life/brazil/chat/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){
  if(name==='node:crypto')return require(name);
  if(name==='@/lib/brazil-chat-history')return {saveChatThread:async()=>{}};
  if(name==='@/lib/brazil-chat-history-core')return {parseThread:t=>t};
  if(name==='next/server')return {NextResponse:{json:(v,o)=>new Response(JSON.stringify(v),o)}};
  if(name==='@/lib/auth-life')return {COOKIE_NAME:'life_session',verifyLifeSession:async(secret,token)=>secret==='life-only'&&token==='valid'};
  if(name==='@/lib/brazil-knowledge')return {askBrazil:execute,brazilDb:async()=>({limit:3,used:0.01}),BrazilBudgetError:class extends Error{}};
  throw Error(name);
 },Buffer,URL,process:{env},console:{error(){}}});return exports.POST;
}
test('chat rejects Lab sessions, missing Life setup, cross-origin calls and oversized questions before any model call',async()=>{
 let calls=0;const execute=async()=>{calls++;return {text:'Ответ',sources:[]};};
 const env={LIFE_SECRET:'life-only',LIFE_PASSWORD_HASH:'configured',LIFE_PASSWORD_SALT:'configured'};
 function request(token,origin='https://example.com',question='Вопрос'){
  const r=new Request('https://example.com/api/life/brazil/chat',{method:'POST',headers:{origin},body:JSON.stringify({question})});
  r.nextUrl=new URL(r.url);r.cookies={get:name=>name==='life_session'&&token?{value:token}:undefined};return r;
 }
 const run=chatRoute(env,execute);
 assert.equal((await run(request('lab-token'))).status,401);
 assert.equal((await chatRoute({...env,LIFE_PASSWORD_HASH:''},execute)(request('valid'))).status,401);
 assert.equal((await run(request('valid','https://attacker.example'))).status,403);
 assert.equal((await run(request('valid','https://example.com','x'.repeat(2000)))).status,400);
 assert.equal(calls,0);
 assert.equal((await run(request('valid'))).status,200);assert.equal(calls,1);
 const proxy=request('valid');proxy.headers.set('host','example.com');proxy.headers.set('x-forwarded-proto','https');proxy.nextUrl=new URL('http://localhost:3000/api/life/brazil/chat');
 assert.equal((await run(proxy)).status,200);assert.equal(calls,2);
});
