import {timingSafeEqual} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {runBrazilDaily} from "@/lib/brazil-knowledge-job";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 const actual=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from(`Bearer ${secret??""}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(process.env.VERCEL_ENV!=="production")return NextResponse.json({status:"disabled_in_preview"});
 try{return NextResponse.json(await runBrazilDaily(),{headers:{"Cache-Control":"no-store"}});}
 catch(error){console.error("Brazil daily update failed",error instanceof Error?error.message:"unknown");return NextResponse.json({error:"Brazil update failed"},{status:500});}
}
