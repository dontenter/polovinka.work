import {parseSource,type Note} from "./brazil-knowledge-core";
export const guideNoteGroups={
 schools:[{title:"Школы и языки",topics:["education_language"]}],
 hospitals:[{title:"Медицина и роды",topics:["healthcare"]}],
 legalization:[{title:"Документы и легализация",topics:["immigration"]}],
 everyday:[{title:"Жильё и районы",topics:["housing","neighborhoods"]},{title:"Банки, расходы и работа",topics:["banking","cost_of_living","work_business"]},{title:"Быт, транспорт и отдых",topics:["daily_life","transport","travel_leisure","pets","safety"]}],
 plan:[{title:"Семья и переезд",topics:["family"]}],
} as const;
export type GuideNoteSection=keyof typeof guideNoteGroups;
export type GuideNote=Pick<Note,"id"|"topic"|"title"|"body"|"city"|"kind"|"date"|"sources">;
export function selectGuideNotes(rows:GuideNote[],topics:readonly string[],limit=8):GuideNote[]{
 const seen=new Set<string>();const result:GuideNote[]=[];
 for(const note of [...rows].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){
  if(!topics.includes(note.topic)||!["experience","recommendation","disputed"].includes(note.kind)||!note.title?.trim()||!note.body?.trim()||!Number.isFinite(Date.parse(note.date))||!Array.isArray(note.sources)||!note.sources.length)continue;
  try{for(const source of note.sources){const key=parseSource(source.url);if(key.id!==source.id||!Number.isFinite(Date.parse(source.date)))throw Error("Invalid citation");}}catch{continue;}
  const key=note.body.toLocaleLowerCase("ru-RU").replace(/\s+/g," ").trim();if(seen.has(key))continue;seen.add(key);
  result.push({...note,sources:note.sources.filter((s,i,all)=>all.findIndex(other=>other.url===s.url)===i)});
  if(result.length===limit)break;
 }
 return result;
}
