import "server-only";
import {createHash} from "node:crypto";
import {brazilDb} from "./brazil-knowledge";
import {parseThread,rootId,mergeThreads,type ChatThread} from "./brazil-chat-history-core";
export async function saveChatThread(value:unknown){
 const thread=parseThread(value);if(!thread.turns.length)return;
 const thread_id=rootId(thread.id);
 const id=createHash("sha256").update(JSON.stringify([thread_id,thread.turns])).digest("hex");
 await brazilDb("life_brazil_chat_history?on_conflict=id",{id,thread_id,created_at:thread.createdAt,updated_at:thread.updatedAt,turns:thread.turns},"POST","resolution=ignore-duplicates,return=minimal");
}
export async function loadChatThreads(){
 const all:ChatThread[]=[];
 for(let offset=0;;offset+=100){
  const rows=await brazilDb<{id:string;thread_id:string;created_at:string;updated_at:string;turns:ChatThread["turns"]}[]>(`rpc/life_brazil_chat_heads?thread_id=neq.archive-smoke-20261104&offset=${offset}&limit=100`,{});
  for(const r of rows)all.push(parseThread({id:r.thread_id+"~"+r.id,createdAt:r.created_at,updatedAt:r.updated_at,turns:r.turns}));
  if(rows.length<100)break;
 }
 return mergeThreads(all);
}
