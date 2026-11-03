export const BRAZIL_CHATS = ["Brazil_ChatForum", "brfloripa"] as const;
export type Source = {id:number;date:string;url:string};
export type Message = {chat:string;id:number;date:string;text:string;reply_to?:number|null;topic_id?:number|null;edited_at?:string|null;media_type?:string|null;processed?:boolean};
export type Note = {id:string;topic:string;title:string;body:string;city:string;kind:string;date:string;sources:Source[];evidence_quote?:string;embedding?:number[]|null};
export type Answer = {text:string;sources:Source[]};
export type DailyQuestion = {question:string;answer:string;sources:Source[]};
export function sourceUrl(chat:string,id:number) {
 if (!(BRAZIL_CHATS as readonly string[]).includes(chat)||!Number.isSafeInteger(id)||id<1) throw Error("Invalid source");
 return `https://t.me/${chat}/${id}`;
}
export function parseSource(url:string) {
 const match=/^https:\/\/t\.me\/(Brazil_ChatForum|brfloripa)\/(\d+)$/.exec(url);
 if(!match) throw Error("Invalid source URL");
 const id=Number(match[2]);sourceUrl(match[1],id);return {chat:match[1],id};
}
export function yesterdayBrazil(now=new Date()) {
 const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 return new Date(Date.parse(day+"T12:00:00Z")-86400000).toISOString().slice(0,10);
}
export function brazilWindow(day:string) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error("Invalid day");
 // Current São Paulo civil offset. Intl determines the civil day above.
 const from=new Date(day+"T00:00:00-03:00");
 if(!Number.isFinite(+from)||from.toISOString().slice(0,10)!==day)throw Error("Invalid day");
 return {from:from.toISOString(),to:new Date(+from+86400000).toISOString()};
}
export function reservationBound(input:unknown,output:number,embedding=false) {
 // UTF-8 bytes bound token count conservatively; include schema/protocol overhead.
 const bound=Buffer.byteLength(JSON.stringify(input),"utf8")+10000;
 return Math.ceil((bound*(embedding?0.02:0.25)+output*2)/1e6*1e6)/1e6;
}
export function validateAnswer(value:unknown,allowed:Map<string,Source>):Answer {
 const v=value as {text?:unknown;source_urls?:unknown};
 if(typeof v?.text!=="string"||!v.text.trim()||v.text.length>7000||!Array.isArray(v.source_urls)||v.source_urls.length>8)throw Error(`Invalid answer (text length ${typeof v?.text==="string"?v.text.length:-1}, sources ${Array.isArray(v?.source_urls)?v.source_urls.length:-1})`);
 const urls=[...new Set(v.source_urls)];
 if(urls.some(u=>typeof u!=="string"||!allowed.has(u)))throw Error("Unknown citation");
 if(!urls.length&&!/недостаточно|не нашл|не хватает|нет (?:сведений|информации|данных)|не подтвержд|не указа|отсутству|не могу подтверд|в базе[^.]*нет/i.test(v.text))throw Error("Uncited assertion");
 if(/https?:\/\//i.test(v.text))throw Error("Inline links are not permitted");
 return {text:v.text,sources:urls.map(u=>allowed.get(u as string)!)};
}
