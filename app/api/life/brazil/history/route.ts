import {NextRequest,NextResponse} from "next/server";
import {COOKIE_NAME,verifyLifeSession} from "@/lib/auth-life";
import {lifeRequestOrigin} from "@/lib/life-origin";
import {saveChatThread,loadChatThreads} from "@/lib/brazil-chat-history";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
async function authorized(r:NextRequest){const secret=process.env.LIFE_SECRET;const token=r.cookies.get(COOKIE_NAME)?.value;return Boolean(secret&&process.env.LIFE_PASSWORD_HASH&&process.env.LIFE_PASSWORD_SALT&&token&&await verifyLifeSession(secret,token));}
export async function GET(r:NextRequest){
 if(!await authorized(r))return NextResponse.json({error:"Войдите в Life."},{status:401,headers});
 try{return NextResponse.json({threads:await loadChatThreads()},{headers});}catch{return NextResponse.json({error:"Серверная история временно недоступна."},{status:503,headers});}
}
export async function POST(r:NextRequest){
 if(!await authorized(r))return NextResponse.json({error:"Войдите в Life."},{status:401,headers});
 if(!lifeRequestOrigin(r.headers))return NextResponse.json({error:"Forbidden"},{status:403,headers});
 if(Number(r.headers.get("content-length"))>3000000)return NextResponse.json({error:"Диалог слишком большой для одного запроса."},{status:413,headers});
 let thread;try{const raw=await r.text();if(Buffer.byteLength(raw)>3000000)throw Error();const {parseThread}=await import("@/lib/brazil-chat-history-core");thread=parseThread(JSON.parse(raw).thread);}catch{return NextResponse.json({error:"Некорректный архив. Исходная копия не изменена."},{status:400,headers});}
 try{await saveChatThread(thread);return NextResponse.json({saved:true},{headers});}catch{return NextResponse.json({error:"Не удалось сохранить историю на сервере."},{status:503,headers});}
}
