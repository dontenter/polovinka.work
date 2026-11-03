import "server-only";
import {brazilDb} from "./brazil-knowledge";
import {guideNoteGroups,selectGuideNotes,type GuideNote,type GuideNoteSection} from "./brazil-guide-topics";
export async function getGuideNotes(section:GuideNoteSection){
 return Promise.all(guideNoteGroups[section].map(async group=>{
  try{
   const rows=await brazilDb<GuideNote[]>(`brazil_notes?select=id,topic,title,body,city,kind,date,sources&topic=in.(${group.topics.join(",")})&kind=in.(experience,recommendation,disputed)&order=date.desc,id.asc&limit=24`);
   return {title:group.title,notes:selectGuideNotes(rows,group.topics)};
  }catch{console.error("Brazil guide notes unavailable",section);return {title:group.title,notes:[]};}
 }));
}
