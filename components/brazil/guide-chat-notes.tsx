import {getGuideNotes} from "@/lib/brazil-guide-notes";
import {type GuideNote,type GuideNoteSection} from "@/lib/brazil-guide-topics";
const formatDate=(date:string)=>new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",year:"numeric",timeZone:"America/Sao_Paulo"}).format(new Date(date));
function NoteCard({note}:{note:GuideNote}){return <article className="guide-chat-note"><div className="guide-chat-note-meta"><span className="guide-chat-badge">Из чатов</span><span>{note.kind==="disputed"?"Есть разногласия":note.kind==="recommendation"?"Совет участника":"Опыт участника"}</span>{note.city&&<span>{note.city}</span>}</div><h4>{note.title}</h4><p>{note.body}</p><div className="guide-chat-citations">{note.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.url.includes("/brfloripa/")?"Флорипа":"Бразилия"} · {formatDate(source.date)} ↗</a>)}</div></article>;}
export async function GuideChatNotes({section}:{section:GuideNoteSection}){
 const groups=(await getGuideNotes(section)).filter(group=>group.notes.length);
 if(!groups.length)return null;
 return <section id={`chat-notes-${section}`} className="brazil-section guide-chat-notes" aria-label="Сведения из чатов"><h2>Из чатов</h2>{groups.map(group=><section className="guide-chat-group" key={group.title}><h3>{group.title}</h3><div className="guide-chat-grid">{group.notes.slice(0,2).map(note=><NoteCard key={note.id} note={note}/>)}</div>{group.notes.length>2&&<details className="guide-chat-more"><summary>Ещё из чатов</summary><div className="guide-chat-grid">{group.notes.slice(2).map(note=><NoteCard key={note.id} note={note}/>)}</div></details>}</section>)}</section>;
}
