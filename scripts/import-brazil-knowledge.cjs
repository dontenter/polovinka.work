/* Run from the portal root. Credentials are loaded privately, never printed. */
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline'),crypto=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw Error('Supabase is not configured');
const root=process.argv[2];if(!root)throw Error('Pass the private export directory');
const headers={apikey:key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'};
if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
async function db(endpoint,body,method){
 const response=await fetch(base.replace(/\/$/,'')+'/rest/v1/'+endpoint,{method:method??(body===undefined?'GET':'POST'),headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(40000)});
 if(!response.ok)throw Error('Database HTTP '+response.status+' ('+endpoint.split('?')[0]+')');
 const text=await response.text();return text?JSON.parse(text):null;
}
async function importLines(name,table){
 let batch=[],count=0;
 for await(const line of readline.createInterface({input:fs.createReadStream(path.join(root,name)),crlfDelay:Infinity})){
  if(!line.trim())continue;batch.push(JSON.parse(line));
  if(batch.length===500){await db(table,batch);count+=batch.length;batch=[];if(count%10000===0)console.log(table,count);}
 }
 if(batch.length){await db(table,batch);count+=batch.length;}
 console.log(table,'imported',count);return count;
}
async function embed(notes){
 const input=notes.map(n=>n.title+'\n'+n.city+'\n'+n.body);
 if(input.some(t=>Buffer.byteLength(t,'utf8')>16000))throw Error('Embedding text too large');
 const payload={model:'text-embedding-3-small',dimensions:512,input};
 const reserved=(Buffer.byteLength(JSON.stringify(payload),'utf8')+10000)*0.02/1e6;
 const id=crypto.randomUUID();
 if(!await db('rpc/brazil_reserve',{p_id:id,p_purpose:'embedding',p_max_usd:reserved}))throw Error('Monthly budget reached');
 const token=process.env.LIFE_OPENAI_API_KEY;if(!token)throw Error('Life API key missing');
 const response=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Embedding HTTP '+response.status);
 const result=await response.json();
 await db('rpc/brazil_settle',{p_id:id,p_input:result.usage.prompt_tokens,p_output:0,p_cached:0});
 const vectors=result.data.sort((a,b)=>a.index-b.index);
 if(vectors.length!==notes.length||vectors.some(v=>v.embedding.length!==512))throw Error('Invalid embedding result');
 await db('brazil_notes',notes.map((n,i)=>({...n,embedding:vectors[i].embedding})));
}
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const states=await db('brazil_state?id=eq.1&select=bootstrap_at');
 const initialized=Boolean(states[0]?.bootstrap_at);
 if(!initialized){
  await importLines('messages.jsonl','brazil_messages?on_conflict=chat,id');
  await importLines('notes.jsonl','brazil_notes?on_conflict=id');
 }
 let indexed=0;
 while(true){
  const notes=await db('brazil_notes?embedding=is.null&select=id,topic,title,body,city,kind,date,sources,evidence_quote&limit=64');
  if(!notes.length)break;await embed(notes);indexed+=notes.length;
  console.log('indexed',indexed);
 }
 const stats=await db('rpc/brazil_stats',{});
 if(stats.messages<manifest.messages||stats.notes<manifest.notes)throw Error('Import coverage mismatch');
 if(!initialized)await db('brazil_state?id=eq.1',{bootstrap_at:new Date().toISOString(),cursors:manifest.cursors,collected_at:manifest.captured_at,analyzed_at:manifest.analyzed_at},'PATCH');
 console.log(JSON.stringify({status:'initialized',stats,budget:await db('rpc/brazil_budget',{})}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
