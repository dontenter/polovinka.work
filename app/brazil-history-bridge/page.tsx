"use client";
import {useEffect} from "react";
import {historyKey} from "@/lib/brazil-chat-history-core";
export default function HistoryBridge(){
 useEffect(()=>{
  const peer=location.origin==="https://www.polovinka.work"?"https://polovinka.work":location.origin==="https://polovinka.work"?"https://www.polovinka.work":null;
  const receive=(event:MessageEvent)=>{
   if(!peer||event.origin!==peer||event.source!==parent||event.data?.type!=="brazil-history-read"||typeof event.data.nonce!=="string")return;
   try{parent.postMessage({type:"brazil-history-result",nonce:event.data.nonce,raw:localStorage.getItem(historyKey)},peer);}
   catch{parent.postMessage({type:"brazil-history-result",nonce:event.data.nonce,error:true},peer);}
  };
  addEventListener("message",receive);return()=>removeEventListener("message",receive);
 },[]);
 return null;
}
