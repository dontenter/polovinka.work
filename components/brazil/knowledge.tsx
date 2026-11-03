"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {MessageCircle,ArrowUpRight,Send,LoaderCircle,ChevronDown,History,Plus,ArrowLeft} from "lucide-react";
import type {BrazilDashboard} from "@/lib/brazil-knowledge";
import type {Answer,Source} from "@/lib/brazil-knowledge-core";
import {useChatHistory} from "./use-chat-history";
import {ChatHistory} from "./chat-history";
const date=(value:string)=>new Intl.DateTimeFormat("ru-RU",{timeZone:"America/Sao_Paulo",day:"numeric",month:"long"}).format(new Date(value));
export function BrazilSources({sources}:{sources:Source[]}){
 return <div className="knowledge-sources">{sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.url.includes("/brfloripa/")?"Флорипа":"Бразилия"} · {date(s.date)} <ArrowUpRight size={13}/></a>)}</div>;
}
export function BrazilQuestions({data}:{data:BrazilDashboard|null}){
 const daily=data?.daily;
 return <section className="knowledge-daily" aria-labelledby="brazil-daily-title"><div className="knowledge-section-heading"><h2 id="brazil-daily-title">Три вопроса дня</h2>{daily&&<p>За {date(daily.day+"T12:00:00Z")} · время Бразилии</p>}</div>
 {!daily?<p className="knowledge-muted">Первая подборка готовится.</p>:!daily.questions.length?<p className="knowledge-muted">За этот день новых содержательных обсуждений не нашлось.</p>:<div className="knowledge-questions">{daily.questions.map((q,i)=><article key={q.question}><details><summary><span className="knowledge-number">0{i+1}</span><h3>{q.question}</h3><ChevronDown className="knowledge-question-chevron" size={20} aria-hidden="true"/></summary><div className="knowledge-answer"><p>{q.answer}</p><BrazilSources sources={q.sources}/></div></details></article>)}</div>}
 {data?.state?.last_error&&<p className="knowledge-muted" role="status">{data.state.last_error==="monthly_budget"?"Месячный лимит анализа достигнут. Сбор сообщений продолжается.":"Обновление ещё не завершено. Здесь показана последняя готовая подборка."}</p>}
 </section>;
}
export function BrazilChat({compact=false}:{data:BrazilDashboard|null;compact?:boolean}){
 const {turns,setTurns,threads,activeId,ready,storageError,openThread,newThread}=useChatHistory();
 const [historyOpen,setHistoryOpen]=useState(false);
 const [question,setQuestion]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
 const input=useRef<HTMLTextAreaElement>(null);
 const chat=useRef<HTMLElement>(null),conversation=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(compact)return;
  const resize=()=>{const root=chat.current?.closest<HTMLElement>(".brazil");if(root)root.style.setProperty("--brazil-chat-viewport-height",`${Math.max(0,(window.visualViewport?.height??window.innerHeight)-(root.getBoundingClientRect().top+window.scrollY))}px`);};
  resize();window.addEventListener("resize",resize);window.visualViewport?.addEventListener("resize",resize);
  let active=true;void document.fonts.ready.then(()=>{if(active)resize();});
  return()=>{active=false;window.removeEventListener("resize",resize);window.visualViewport?.removeEventListener("resize",resize);};
 },[compact]);
 useEffect(()=>{const el=conversation.current;if(el)el.scrollTo({top:el.scrollHeight,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});},[turns,pending]);
 useEffect(()=>{if(!pending&&turns.length)input.current?.focus({preventScroll:true});},[pending,turns.length]);
 useEffect(()=>{const el=input.current;if(el){el.style.height="auto";el.style.height=`${Math.min(el.scrollHeight,112)}px`;}},[question]);
 async function send(event:FormEvent){
  event.preventDefault();const text=question.trim();if(!text||pending||!ready)return;
  setError("");setQuestion("");setTurns(t=>[...t,{role:"user",text}]);setPending(true);
  try{
   const response=await fetch("/api/life/brazil/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:text,history:turns.slice(-6).map(t=>({role:t.role,text:t.text}))})});
   const result=await response.json();if(!response.ok)throw Error(result.error??"Ответ недоступен.");
   const answer=result.answer as Answer;setTurns(t=>[...t,{role:"assistant",text:answer.text,sources:answer.sources}]);
  }catch(e){setError(e instanceof Error?e.message:"Ответ недоступен.");setQuestion(text);}finally{setPending(false);}
 }
 return <section ref={chat} className={`knowledge-chat ${compact?"knowledge-chat-compact":""}`} aria-labelledby="brazil-chat-title"><div className="knowledge-section-heading"><Link href="/life/brazil" className="knowledge-chat-back" aria-label="Вернуться к Бразилии"><ArrowLeft size={22}/></Link><h2 id="brazil-chat-title"><MessageCircle size={27}/> Чат по Бразилии</h2><div className="knowledge-chat-actions"><button type="button" disabled={pending||!ready} aria-label="История" title="История" onClick={()=>setHistoryOpen(true)}><History size={18}/><span>История</span></button><button type="button" disabled={pending||!ready} aria-label="Новый диалог" title="Новый диалог" onClick={()=>{newThread();setQuestion("");setError("");setHistoryOpen(false);input.current?.focus({preventScroll:true});}}><Plus size={18}/><span>Новый диалог</span></button></div></div>
 {!turns.length&&<div className="knowledge-suggestions">{["Как снять жильё во Флорианополисе?","Как открыть банковский счёт?","Что пишут про школы на острове?"].map(q=><button key={q} onClick={()=>{setQuestion(q);input.current?.focus();}}>{q}</button>)}</div>}
 {!!turns.length&&<div ref={conversation} className="knowledge-conversation" tabIndex={0} aria-label="Переписка — прокрутите для просмотра предыдущих сообщений" role="log" aria-live="polite" aria-relevant="additions">{turns.map((turn,i)=><article key={i} className={`knowledge-turn knowledge-turn-${turn.role}`}><strong>{turn.role==="user"?"Вы":"База знаний"}</strong><p>{turn.text}</p></article>)}</div>}
 {pending&&<p className="knowledge-pending" role="status"><LoaderCircle className="animate-spin" size={19}/> Отвечаю…</p>}
 <form onSubmit={send} className="knowledge-form"><label htmlFor="brazil-question" className="sr-only">Ваш вопрос о Бразилии</label><textarea ref={input} id="brazil-question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1800} rows={1} placeholder={turns.length?"Продолжить разговор…":"Ваш вопрос…"} disabled={pending||!ready}/><button type="submit" disabled={pending||!ready||!question.trim()} aria-label="Отправить вопрос"><Send size={21}/><span>Спросить</span></button></form>
 {error&&<p className="knowledge-error" role="alert">{error}</p>}
 {storageError&&<p className="knowledge-storage-error" role="status">{storageError}</p>}
 {historyOpen&&<ChatHistory threads={threads} activeId={activeId} onClose={()=>setHistoryOpen(false)} onSelect={id=>{if(pending)return;openThread(id);setQuestion("");setError("");setHistoryOpen(false);}}/>}
 </section>;
}
