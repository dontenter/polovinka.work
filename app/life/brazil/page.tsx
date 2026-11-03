import { BrazilQuestions } from "@/components/brazil/knowledge";
import { brazilDashboard } from "@/lib/brazil-knowledge";
import { BrazilMap } from "@/components/brazil/map";
export const dynamic="force-dynamic";
export default async function BrazilPage() {const data=await brazilDashboard();return <><BrazilQuestions data={data}/><BrazilMap/></>;}
