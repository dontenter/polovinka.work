import {randomUUID} from "node:crypto";
import {saveChatThread} from "@/lib/brazil-chat-history";
import {parseThread,type ChatThread} from "@/lib/brazil-chat-history-core";
import {NextRequest,NextResponse} from "next/server";
import {verifyLifeSession,COOKIE_NAME} from "@/lib/auth-life";
import {askBrazil,brazilDb,BrazilBudgetError} from "@/lib/brazil-knowledge";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
export async function POST(request:NextRequest){
 const secret=process.env.LIFE_SECRET,token=request.cookies.get(COOKIE_NAME)?.value;
 const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
 if(!secret||!process.env.LIFE_PASSWORD_HASH||!process.env.LIFE_PASSWORD_SALT||!token||!await verifyLifeSession(secret,token))return NextResponse.json({error:"Войдите в Life."},{status:401,headers});
 const origin=request.headers.get("origin");
 if(origin){
  const host=request.headers.get("host")??request.nextUrl.host;
  const protocol=request.headers.get("x-forwarded-proto")?.split(",")[0].trim()??request.nextUrl.protocol.replace(":","");
  try{const source=new URL(origin);if(source.host!==host||source.protocol!==protocol+":")throw Error();}
  catch{return NextResponse.json({error:"Forbidden"},{status:403,headers});}
 }
 if(Number(request.headers.get("content-length"))>3000000)return NextResponse.json({error:"Слишком длинный запрос."},{status:413,headers});
 let thread:ChatThread;
 let question:string,history:{role:string;text:string}[];
 try {
  const raw=await request.text();if(raw.length>3000000)throw Error();const body=JSON.parse(raw);
  if(typeof body.question!=="string"||!body.question.trim()||body.question.length>1800)throw Error();
  question=body.question.trim();
  const now=new Date().toISOString();thread=body.thread?parseThread(body.thread):{id:randomUUID(),createdAt:now,updatedAt:now,turns:[{role:"user",text:question}]};
  if(thread.turns.at(-1)?.role!=="user"||thread.turns.at(-1)?.text!==question)throw Error();
  history=Array.isArray(body.history)?body.history.slice(-6).filter((h:{role?:unknown;text?:unknown})=>["user","assistant"].includes(String(h.role))&&typeof h.text==="string").map((h:{role:string;text:string})=>({role:h.role,text:h.text.slice(0,700)})):[];
 }catch{return NextResponse.json({error:"Напишите вопрос длиной до 1800 символов."},{status:400,headers});}
 try {
  await saveChatThread(thread);
  const answer=await askBrazil(question,history);
  await saveChatThread({...thread,updatedAt:new Date().toISOString(),turns:[...thread.turns,{role:"assistant",text:answer.text,sources:answer.sources}]});const budget=await brazilDb("rpc/brazil_budget",{});
  return NextResponse.json({answer,budget},{headers});
 }catch(error){
  if(error instanceof BrazilBudgetError)return NextResponse.json({error:error.message},{status:429,headers});
  console.error("Brazil chat failed",error instanceof Error?error.message:"unknown");
  return NextResponse.json({error:"Не удалось получить ответ. Попробуйте ещё раз позже."},{status:503,headers});
 }
}
