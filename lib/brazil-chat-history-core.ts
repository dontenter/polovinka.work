import type {Source} from "./brazil-knowledge-core";
export type ChatTurn={role:"user"|"assistant";text:string;sources?:Source[]};
export type ChatThread={id:string;createdAt:string;updatedAt:string;turns:ChatTurn[]};
export type Archive={version:1;activeId:string|null;threads:ChatThread[]};
export const historyKey="life-brazil-chat-history-v1";
export const emptyArchive=():Archive=>({version:1,activeId:null,threads:[]});
export const rootId=(id:string)=>id.split("~")[0];
export function parseThread(value:unknown):ChatThread {
 const t=value as ChatThread;
 if(!t||typeof t.id!=="string"||!/^[-a-zA-Z0-9_~]{1,200}$/.test(t.id)||!Number.isFinite(Date.parse(t.createdAt))||!Number.isFinite(Date.parse(t.updatedAt))||!Array.isArray(t.turns)||t.turns.length>5000)throw Error("Invalid thread");
 const turns=t.turns.map(turn=>{
  if(!turn||!["user","assistant"].includes(turn.role)||typeof turn.text!=="string"||turn.text.length>200000)throw Error("Invalid turn");
  const sources=Array.isArray(turn.sources)?turn.sources.filter(s=>Number.isSafeInteger(s.id)&&typeof s.url==="string"&&/^https:\/\/t\.me\//i.test(s.url)&&Number.isFinite(Date.parse(s.date))).map(s=>({id:s.id,url:s.url,date:s.date})):[];
  return {role:turn.role,text:turn.text,...(sources.length?{sources}: {})};
 });
 return {id:t.id,createdAt:new Date(t.createdAt).toISOString(),updatedAt:new Date(t.updatedAt).toISOString(),turns};
}
export function parseArchive(raw:string|null):Archive {
 if(!raw)return emptyArchive();const a=JSON.parse(raw);
 if(a?.version!==1||!Array.isArray(a.threads))throw Error("Invalid archive");
 const threads=a.threads.map(parseThread);return {version:1,activeId:threads.some((t:ChatThread)=>t.id===a.activeId)?a.activeId:null,threads};
}
export const fingerprint=(t:ChatThread)=>JSON.stringify([rootId(t.id),t.turns]);
export function prefix(a:ChatTurn[],b:ChatTurn[]){return a.length<=b.length&&a.every((t,i)=>JSON.stringify(t)===JSON.stringify(b[i]));}
function branchId(t:ChatThread){let hash=BigInt("14695981039346656037");for(const c of fingerprint(t)){hash^=BigInt(c.codePointAt(0)!);hash=BigInt.asUintN(64,hash*BigInt("1099511628211"));}return rootId(t.id)+"~"+hash.toString(16);}
export function mergeThreads(...groups:ChatThread[][]):ChatThread[]{
 const heads:ChatThread[]=[];
 for(const input of groups.flat()){
  const t=parseThread(input);if(!t.turns.length)continue;
  const compatible=heads.findIndex(h=>rootId(h.id)===rootId(t.id)&&(prefix(h.turns,t.turns)||prefix(t.turns,h.turns)));
  if(compatible>=0){const old=heads[compatible];if(t.turns.length>old.turns.length)heads[compatible]={...t,id:old.id};continue;}
  if(heads.some(h=>h.id===t.id)){let id=branchId(t);while(heads.some(h=>h.id===id))id+="_";t.id=id;}
  heads.push(t);
 }
 return heads.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
