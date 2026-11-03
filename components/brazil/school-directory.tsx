"use client";
import { useState } from "react";
import { schools, mapLink } from "@/lib/brazil-data";
import { Source } from "./source";
export function SchoolDirectory() {
  const [filter,setFilter] = useState<"all" | "language" | "local">("all");
  const shown=schools.filter(p=>filter==="all" || (filter==="language" ? p.schoolKind!=="local" : p.schoolKind==="local"));
  return <><div className="school-filters" role="group" aria-label="Тип школы">{([['all','Все школы'],['language','Международные и билингвальные'],['local','Другие школы']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><p className="section-lead">Найдено: {shown.length}. Список охватывает разные районы; наличие мест и подходящую программу для 8 лет подтверждает школа.</p><div className="school-grid">{shown.map(p=><article className="info-card" key={p.id}><h3>{p.name}</h3><p className="school-format">{p.area} · {p.schoolKind==="international" ? "Международная" : p.schoolKind==="bilingual" ? "Билингвальная программа" : "Языковую программу уточнить"}</p><p>{p.summary}</p><p>{p.note}</p><p className="address">{p.address}</p><Source href={p.source}>{p.sourceLabel}</Source><Source href={mapLink(p)}>Найти по адресу</Source></article>)}</div></>;
}
