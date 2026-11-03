"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {emptyArchive,parseArchive,parseThread,mergeThreads,fingerprint,historyKey,type Archive,type ChatTurn,type ChatThread} from "@/lib/brazil-chat-history-core";
export type {ChatTurn,ChatThread} from "@/lib/brazil-chat-history-core";
export function useChatHistory(){
 const [archive,setArchive]=useState<Archive>(emptyArchive),[ready,setReady]=useState(false);
 const [storageError,setStorageError]=useState(""),[cloudError,setCloudError]=useState(""),[bridgeError,setBridgeError]=useState("");
 const current=useRef(archive),uploaded=useRef(new Set<string>()),writable=useRef(true),syncing=useRef(false),intentionalNew=useRef(false);
 const commit=useCallback((next:Archive)=>{current.current=next;setArchive(next);},[]);
 const absorb=useCallback((threads:ChatThread[],preferredId?:string|null)=>{
  const old=current.current;const merged=mergeThreads(old.threads,threads);const next={...old,threads:merged,activeId:old.activeId??(!intentionalNew.current?(merged.find(t=>t.id===preferredId)?.id??merged[0]?.id??null):null)};
  if(JSON.stringify(old)!==JSON.stringify(next))commit(next);
 },[commit]);
 useEffect(()=>{
  try{const raw=localStorage.getItem(historyKey);const parsed=parseArchive(raw);commit(parsed);
   if(raw&&!localStorage.getItem(historyKey+"-pre-cloud-backup"))localStorage.setItem(historyKey+"-pre-cloud-backup",raw);
  }catch{writable.current=false;setStorageError("Локальная история недоступна. Исходная копия не перезаписывается.");}
  setReady(true);
 },[commit]);
 useEffect(()=>{
  if(!ready)return;let live=true;
  const load=async()=>{try{const r=await fetch("/api/life/brazil/history",{cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();const threads=d.threads.map(parseThread);for(const t of threads)uploaded.current.add(fingerprint(t));if(live){absorb(threads);setCloudError("");}}catch{if(live)setCloudError("Серверная история пока не синхронизирована. Локальная копия сохраняется; повторим автоматически.");}};
  void load();window.addEventListener("focus",load);window.addEventListener("online",load);
  return()=>{live=false;window.removeEventListener("focus",load);window.removeEventListener("online",load);};
 },[ready,absorb]);
 useEffect(()=>{
  if(!ready||!writable.current)return;
  try{const stored=parseArchive(localStorage.getItem(historyKey));localStorage.setItem(historyKey,JSON.stringify({...archive,threads:mergeThreads(archive.threads,stored.threads)}));setStorageError("");}
  catch{writable.current=false;setStorageError("Не удалось сохранить локальную копию. История в браузере не удаляется.");}
 },[archive,ready]);
 useEffect(()=>{
  if(!ready)return;let live=true;
  const sync=async()=>{if(syncing.current)return;syncing.current=true;
   try{for(const thread of current.current.threads){const key=fingerprint(thread);if(uploaded.current.has(key))continue;
    const r=await fetch("/api/life/brazil/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thread}),keepalive:JSON.stringify(thread).length<50000});if(!r.ok)throw Error();uploaded.current.add(key);}
    if(live)setCloudError("");
   }catch{if(live)setCloudError("Не удалось сохранить историю на сервере. Локальная копия сохранена; повторим автоматически.");}
   finally{syncing.current=false;}
  };
  const timer=setTimeout(()=>void sync(),250);const retry=setInterval(()=>void sync(),15000);window.addEventListener("online",sync);
  return()=>{live=false;clearTimeout(timer);clearInterval(retry);window.removeEventListener("online",sync);};
 },[archive,ready]);
 useEffect(()=>{
  if(!ready)return;
  const peer=location.origin==="https://www.polovinka.work"?"https://polovinka.work":location.origin==="https://polovinka.work"?"https://www.polovinka.work":null;
  if(!peer)return;
  const frame=document.createElement("iframe"),nonce=crypto.randomUUID();frame.hidden=true;frame.title="Восстановление истории со второго адреса";
  let complete=false;
  const receive=(event:MessageEvent)=>{if(event.origin!==peer||event.source!==frame.contentWindow||event.data?.type!=="brazil-history-result"||event.data.nonce!==nonce)return;
   complete=true;
   try{if(event.data.error)throw Error();const recovered=parseArchive(event.data.raw);absorb(recovered.threads,recovered.activeId);setBridgeError("");}
   catch{setBridgeError("Не удалось прочитать историю со второго адреса. Она не изменена.");}
  };
  const ask=()=>frame.contentWindow?.postMessage({type:"brazil-history-read",nonce},peer);
  window.addEventListener("message",receive);frame.src=peer+"/brazil-history-bridge";frame.onload=ask;document.body.append(frame);
  const retry=setInterval(()=>{if(!complete)ask();},500);const timeout=setTimeout(()=>{if(!complete)setBridgeError("Проверка истории со второго адреса не завершилась. Откройте этот чат на "+peer+" в том же браузере.");clearInterval(retry);},20000);
  return()=>{window.removeEventListener("message",receive);clearTimeout(timeout);clearInterval(retry);frame.remove();};
 },[ready,absorb]);
 const setTurns=useCallback((update:(turns:ChatTurn[])=>ChatTurn[])=>{
  const state=current.current;const existing=state.threads.find(t=>t.id===state.activeId);const now=new Date().toISOString();
  const thread:ChatThread={id:existing?.id??crypto.randomUUID(),createdAt:existing?.createdAt??now,updatedAt:now,turns:update(existing?.turns??[])};
  commit({version:1,activeId:thread.id,threads:[thread,...state.threads.filter(t=>t.id!==thread.id)]});return thread;
 },[commit]);
 return {turns:archive.threads.find(t=>t.id===archive.activeId)?.turns??[],setTurns,threads:archive.threads,activeId:archive.activeId,ready,storageError:[storageError,cloudError,bridgeError].filter(Boolean).join(" "),openThread:(id:string)=>commit({...current.current,activeId:id}),newThread:()=>{intentionalNew.current=true;commit({...current.current,activeId:null});}};
}
