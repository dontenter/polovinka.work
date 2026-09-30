// Import a reviewed local digest. Source messages and credentials are not uploaded.
const fs = require('node:fs');
const path = require('node:path');
require('@next/env').loadEnvConfig(process.cwd());
async function main() {
  const folder = path.resolve(process.argv[2] || '');
  const id = path.basename(folder);
  if (!/^\d{8}T\d{6}Z$/.test(id)) throw Error('Supply a timestamped local run directory');
  const source = JSON.parse(fs.readFileSync(path.join(folder,'source.json'),'utf8'));
  const usage = JSON.parse(fs.readFileSync(path.join(folder,'usage.json'),'utf8'));
  const row = { id, period_from: source.from, period_to: source.to, model: usage.model,
    message_count: source.chats.reduce((n,c)=>n+c.messages.filter(m=>!m.context_only).length,0),
    markdown: fs.readFileSync(path.join(folder,'summary.md'),'utf8') };
  const key = process.env.SUPABASE_SECRET_KEY;
  const base = process.env.SUPABASE_URL;
  if (!key || !base) throw Error('Supabase settings missing');
  const headers = { apikey: key, 'Content-Type':'application/json' };
  const existing = await fetch(base+'/rest/v1/life_digests?id=eq.'+id+'&select=id', { headers, signal: AbortSignal.timeout(15000) });
  if(!existing.ok) throw Error('Read failed: '+existing.status);
  if((await existing.json()).length) { console.log('Digest already exists; not overwritten:',id);return; }
  const res = await fetch(base+'/rest/v1/life_digests',{ method:'POST',headers,body:JSON.stringify(row),signal:AbortSignal.timeout(15000) });
  if(!res.ok) throw Error('Import failed: '+res.status);
  console.log('Imported reviewed digest:',id,'Text messages:',row.message_count);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
