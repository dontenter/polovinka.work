const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,context={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,...context});return exports;}
const core=load('lib/brazil-chat-history-core.ts');
const turn=(text,role='user')=>({role,text});
const thread=(texts,id='test-thread')=>({id,createdAt:'2026-10-24T00:00:00Z',updatedAt:'2026-11-04T00:00:00Z',turns:texts.map(t=>turn(t))});
test('copies from two domains merge without dropping longer or divergent conversations',()=>{
 const full=thread(['вопрос','ответ','продолжение']);const short=thread(['вопрос']);
 for(const groups of [[full,short],[short,full]])assert.equal(core.mergeThreads(groups)[0].turns.length,3);
 const divergent=thread(['вопрос','другой ответ']);let merged=core.mergeThreads([full],[divergent]);
 assert.equal(merged.length,2);assert.equal(new Set(merged.map(t=>t.id)).size,2);
 for(let i=0;i<20;i++)merged=core.mergeThreads(merged,[full,short,divergent]);
 assert.equal(merged.length,2);assert.ok(merged.some(t=>t.turns.at(-1).text==='продолжение'));assert.ok(merged.some(t=>t.turns.at(-1).text==='другой ответ'));
 assert.equal(core.mergeThreads(merged,[]).length,2);
});
test('legacy archive keeps messages and citations; invalid data is refused rather than silently reset',()=>{
 const legacy={version:1,activeId:'test-thread',threads:[thread(['старый вопрос'])]};legacy.threads[0].turns.push({role:'assistant',text:'старый ответ',sources:[{id:123,url:'https://t.me/brfloripa/123',date:'2026-10-24T00:00:00Z'}]});
 const restored=core.parseArchive(JSON.stringify(legacy));assert.equal(restored.threads[0].turns[1].sources[0].url,'https://t.me/brfloripa/123');assert.equal(restored.activeId,'test-thread');
 assert.throws(()=>core.parseArchive('{bad data'));assert.throws(()=>core.parseThread({...thread(['x']),id:'../bad'}));
});
async function mountHistory(raw,quota=false){
 const state=[],effects=[],pending=[];let cursor=0,dirty=true;const values=new Map([[core.historyKey,raw]]),writes=[];
 const react={useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],next=>{const v=typeof next==='function'?next(state[i]):next;if(!Object.is(v,state[i])){state[i]=v;dirty=true;}}];},useRef(initial){const i=cursor++;return state[i]??(state[i]={current:initial});},useCallback(fn,deps){const i=cursor++,old=state[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))state[i]={fn,deps};return state[i].fn;},useEffect(fn,deps){const i=cursor++;const old=effects[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j]))){pending.push(()=>{old?.cleanup?.();effects[i]={deps,cleanup:fn()};});}}};
 const context={require(name){if(name==='react')return react;if(name==='@/lib/brazil-chat-history-core')return core;throw Error(name);},localStorage:{getItem:key=>values.get(key)??null,setItem(key,value){if(quota)throw Error('quota');values.set(key,value);writes.push(key);}},window:{addEventListener(){},removeEventListener(){}},location:{origin:'http://localhost'},crypto:{randomUUID:()=> 'new-thread'},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},fetch:async()=>({ok:true,json:async()=>({threads:[]})})};
 const hook=load('components/brazil/use-chat-history.ts',context).useChatHistory;let result;
 for(let i=0;i<8;i++){if(dirty){dirty=false;cursor=0;result=hook();while(pending.length)pending.shift()();}await Promise.resolve();await Promise.resolve();}
 return {result,values,writes};
}
test('first hydration backs up old history; quota failures still display it and never overwrite originals',async()=>{
 const raw=JSON.stringify({version:1,activeId:'test-thread',threads:[thread(['сохранённый вопрос'])]});
 const mounted=await mountHistory(raw);assert.equal(mounted.result.turns[0].text,'сохранённый вопрос');assert.equal(mounted.values.get(core.historyKey+'-pre-cloud-backup'),raw);
 const quota=await mountHistory(raw,true);assert.equal(quota.result.turns[0].text,'сохранённый вопрос');assert.equal(quota.values.get(core.historyKey),raw);assert.equal(quota.writes.length,0);
 const damaged=await mountHistory('{damaged');assert.equal(damaged.values.get(core.historyKey),'{damaged');assert.equal(damaged.writes.length,0);
});
function historyRoute(saved,loaded){return load('app/api/life/brazil/history/route.ts',{Buffer,process:{env:{LIFE_SECRET:'test',LIFE_PASSWORD_HASH:'configured',LIFE_PASSWORD_SALT:'configured'}},require(name){if(name==='next/server')return {NextResponse:{json:(v,o)=>new Response(JSON.stringify(v),o)}};if(name==='@/lib/auth-life')return {COOKIE_NAME:'life_session',verifyLifeSession:async(s,t)=>t==='valid'};if(name==='@/lib/life-origin')return {lifeRequestOrigin:h=>h.get('origin')==='https://www.polovinka.work'?'https://www.polovinka.work':null};if(name==='@/lib/brazil-chat-history')return {saveChatThread:saved,loadChatThreads:loaded};if(name==='@/lib/brazil-chat-history-core')return core;throw Error(name);}});}
const request=(token='valid',origin='https://www.polovinka.work')=>{const r=new Request('https://www.polovinka.work/api/life/brazil/history',{method:'POST',headers:{origin},body:JSON.stringify({thread:thread(['question'])})});r.cookies={get:()=>({value:token})};return r;};
test('server history rejects unauthenticated and foreign-origin requests without reading or saving data',async()=>{
 let calls=0;const route=historyRoute(async()=>calls++,async()=>{calls++;return [];});
 assert.equal((await route.GET(request('lab-token'))).status,401);assert.equal((await route.POST(request('lab-token'))).status,401);assert.equal((await route.POST(request('valid','https://attacker.example'))).status,403);assert.equal(calls,0);
 assert.equal((await route.POST(request())).status,200);assert.equal((await route.GET(request())).status,200);assert.equal(calls,2);
});
test('cross-domain bridge does not disclose history to unrelated parents',()=>{
 const exports={},listeners={},sent=[];const parent={postMessage:(...args)=>sent.push(args)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/brazil-history-bridge/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,parent,location:{origin:'https://polovinka.work'},localStorage:{getItem:()=> 'legacy-data'},addEventListener:(event,fn)=>listeners[event]=fn,removeEventListener(){},require(name){if(name==='react')return {useEffect:fn=>fn()};if(name==='@/lib/brazil-chat-history-core')return core;throw Error(name);}});
 exports.default();const data={type:'brazil-history-read',nonce:'nonce'};
 listeners.message({origin:'https://attacker.example',source:parent,data});assert.equal(sent.length,0);
 listeners.message({origin:'https://www.polovinka.work',source:{},data});assert.equal(sent.length,0);
 listeners.message({origin:'https://www.polovinka.work',source:parent,data});assert.equal(sent.length,1);assert.equal(sent[0][1],'https://www.polovinka.work');assert.equal(sent[0][0].raw,'legacy-data');
});
