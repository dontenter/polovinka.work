"use client";
import {useCallback,useEffect,useState} from "react";
import type {Source} from "@/lib/brazil-knowledge-core";
export type ChatTurn={role:"user"|"assistant";text:string;sources?:Source[]};
export type ChatThread={id:string;createdAt:string;updatedAt:string;turns:ChatTurn[]};
type Archive={version:1;activeId:string|null;threads:ChatThread[]};
const key="life-brazil-chat-history-v1";
const empty=():Archive=>({version:1,activeId:null,threads:[]});
function readArchive(raw:string|null):Archive{
 if(!raw)return empty();
 const data=JSON.parse(raw);if(data?.version!==1||!Array.isArray(data.threads))throw Error("Invalid history");
 const threads:ChatThread[]=data.threads.map((thread:ChatThread)=>{
  if(typeof thread.id!=="string"||!Number.isFinite(Date.parse(thread.createdAt))||!Number.isFinite(Date.parse(thread.updatedAt))||!Array.isArray(thread.turns))throw Error("Invalid thread");
  const turns=thread.turns.map((turn:ChatTurn)=>{
   if(!["user","assistant"].includes(turn.role)||typeof turn.text!=="string")throw Error("Invalid turn");
   return {role:turn.role,text:turn.text,sources:Array.isArray(turn.sources)?turn.sources.filter(s=>typeof s.id==="number"&&typeof s.url==="string"&&/^https:\/\/t\.me\//i.test(s.url)&&Number.isFinite(Date.parse(s.date))):undefined};
  });return {id:thread.id,createdAt:thread.createdAt,updatedAt:thread.updatedAt,turns};
 });
 return {version:1,activeId:threads.some(t=>t.id===data.activeId)?data.activeId:null,threads};
}
function merge(remote:ChatThread[],local:ChatThread[]){const byId=new Map(remote.map(t=>[t.id,t]));for(const thread of local){const old=byId.get(thread.id);if(!old||thread.updatedAt>=old.updatedAt)byId.set(thread.id,thread);}return [...byId.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
export function useChatHistory(){
 const [archive,setArchive]=useState<Archive>(empty),[ready,setReady]=useState(false),[storageError,setStorageError]=useState("");
 useEffect(()=>{try{setArchive(readArchive(localStorage.getItem(key)));}catch{setStorageError("История недоступна в этом браузере. Новые сообщения могут не сохраниться.");}setReady(true);},[]);
 useEffect(()=>{if(!ready)return;try{const stored=readArchive(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify({...archive,threads:merge(stored.threads,archive.threads)}));setStorageError("");}catch{setStorageError("Не удалось сохранить историю. Проверьте свободное место и разрешение на хранение данных в браузере.");}},[archive,ready]);
 const setTurns=useCallback((update:(turns:ChatTurn[])=>ChatTurn[])=>{setArchive(current=>{const existing=current.threads.find(t=>t.id===current.activeId);const now=new Date().toISOString();const thread:ChatThread={id:existing?.id??crypto.randomUUID(),createdAt:existing?.createdAt??now,updatedAt:now,turns:update(existing?.turns??[])};return {version:1,activeId:thread.id,threads:[thread,...current.threads.filter(t=>t.id!==thread.id)]};});},[]);
 return {turns:archive.threads.find(t=>t.id===archive.activeId)?.turns??[],setTurns,threads:archive.threads,activeId:archive.activeId,ready,storageError,openThread:(id:string)=>setArchive(current=>({...current,activeId:id})),newThread:()=>setArchive(current=>({...current,activeId:null}))};
}
