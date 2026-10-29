const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require(name) { if (name in imports) return imports[name]; throw Error(name); }, Date, AbortSignal, console: { error() {} }, ...extra });
  return exports;
}
const ids=load('lib/assessor-id.ts',{});
const core=load('lib/assessor-telegram-core.ts',{'node:crypto':require('node:crypto'),'@/lib/assessor-id':ids});
const job={game_id:'j46ohwmlic5whq',title:'Test game',reason:'Review note'};
function setup({enabled=true,title=core.ASSESSOR_TELEGRAM_CHAT_TITLE,existing=false,verify=true}={}){
 const calls=[],sent=[],messages=existing?[{out:true,id:77,message:core.assessorNotificationText(job)}]:[];
 class Chat { constructor(){this.id={toString:()=>core.ASSESSOR_TELEGRAM_CHAT_ID};this.title=title;} }
 class TelegramClient {
  async connect(){} async disconnect(){} async isUserAuthorized(){return true;}
  async getEntity(){return new Chat();} async getMessages(){return messages;}
  async invoke(request){sent.push(request);if(verify)messages.push({out:true,id:78,message:request.message});}
 }
 const impl=load('lib/assessor-telegram.ts',{
  'server-only':{},'node:crypto':require('node:crypto'),'big-integer':require('big-integer'),
  telegram: { TelegramClient, Api: {
    Chat, InputPeerChat: class { constructor(input) { Object.assign(this,input); } },
    messages: { SendMessage: class { constructor(input) { Object.assign(this,input); } } },
  } },
  'telegram/sessions':{StringSession:class{}},'telegram/extensions/Logger':{Logger:class{},LogLevel:{NONE:0}},'@/lib/assessor-telegram-core':core,
 },{process:{env:{VERCEL_ENV:'production',ASSESSOR_TELEGRAM_ENABLED:String(enabled),SUPABASE_SECRET_KEY:'sb_secret_test',SUPABASE_URL:'https://test.supabase.co',LIFE_TELEGRAM_SESSION:'test',LIFE_TELEGRAM_API_ID:'1',LIFE_TELEGRAM_API_HASH:'test'}},
 fetch:async(url,init)=>{const body=JSON.parse(init.body);calls.push({url,body});return Response.json(url.endsWith('/assessor_telegram_claim')?[job]:true);}});
 return {run:impl.deliverAssessorNotifications,calls,sent};
}
test('notification includes observed game URL and note, fits Telegram and has stable per-game delivery identity',()=>{
 const text=core.assessorNotificationText(job);assert.match(text,/https:\/\/playgama.ai\/play\/j46ohwmlic5whq/);assert.match(text,/Note: Review note/);
 assert.equal(core.assessorNotificationRandomId(job.game_id),core.assessorNotificationRandomId(job.game_id));assert.notEqual(core.assessorNotificationRandomId(job.game_id),core.assessorNotificationRandomId('abcdefgh01'));
 assert.ok(core.assessorNotificationText({...job,title:'a'.repeat(1000),reason:'x'.repeat(10000)}).length<4096);
 assert.throws(()=>core.assessorNotificationText({...job,game_id:'../evil'}));
});
test('delivery is limited to the chosen chat and acknowledged only after Telegram readback',async()=>{
 const {run,calls,sent}=setup();assert.equal((await run()).sent,1);assert.equal(sent.length,1);assert.equal(sent[0].peer.chatId.toString(),'5303410048');assert.equal(calls.at(-1).body.p_message_id,78);
});
test('retry after an acknowledgement failure finds the existing message instead of sending twice',async()=>{
 const {run,calls,sent}=setup({existing:true});assert.equal((await run()).sent,1);assert.equal(sent.length,0);assert.equal(calls.at(-1).body.p_message_id,77);
});
test('wrong destination or uncertain delivery leaves an error for retry, never records success',async()=>{
 for(const config of [{title:'Wrong group'},{verify:false}]){
  const {run,calls,sent}=setup(config);assert.equal((await run()).status,'failed');assert.equal(calls.at(-1).body.p_message_id,null);assert.ok(calls.at(-1).body.p_error);if(config.title)assert.equal(sent.length,0);
 }
});
test('feature disabled performs no database or Telegram calls',async()=>{
 const {run,calls,sent}=setup({enabled:false});assert.equal((await run()).status,'disabled');assert.equal(calls.length,0);assert.equal(sent.length,0);
});
