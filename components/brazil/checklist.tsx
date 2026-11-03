"use client";
import {useEffect, useState} from "react";
import { checklist } from "@/lib/brazil-data";
const key = "life-brazil-checklist-v1";
export function BrazilChecklist() {
 const [checked, setChecked] = useState<string[]>([]); const [loaded, setLoaded] = useState(false); const [storageError, setStorageError] = useState(false);
 useEffect(()=>{try {const saved: unknown = JSON.parse(localStorage.getItem(key) || "[]"); if (Array.isArray(saved)) setChecked(saved.filter((id): id is string => typeof id === "string" && checklist.some(item=>item.id===id)));}catch {setStorageError(true);} setLoaded(true);},[]);
 const toggle = (id: string) => { const next = checked.includes(id) ? checked.filter(x=>x!==id) : [...checked,id]; setChecked(next); try {localStorage.setItem(key,JSON.stringify(next)); setStorageError(false);}catch {setStorageError(true);} };
 return <><div className="checklist-progress"><div><strong>{checked.length} из {checklist.length}</strong><span>шагов подготовки выполнено</span></div><progress value={checked.length} max={checklist.length} aria-label="Подготовка к переезду"/></div><p className="precision-note" role="status">{storageError ? "Сохранение в браузере недоступно. Отметки работают только до закрытия страницы." : "Отметки сохраняются только в этом браузере. Между устройствами не синхронизируются."}</p>{[...new Set(checklist.map(x=>x.stage))].map(stage=><section className="checklist-stage" key={stage}><h3>{stage}</h3>{checklist.filter(x=>x.stage===stage).map(item=><label className={checked.includes(item.id)?"checklist-item done":"checklist-item"} key={item.id}><input type="checkbox" checked={checked.includes(item.id)} disabled={!loaded} onChange={()=>toggle(item.id)}/><span>{item.text}</span></label>)}</section>)}</>;
}
