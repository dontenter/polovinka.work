import {BrazilChat} from "@/components/brazil/knowledge";
import {brazilDashboard} from "@/lib/brazil-knowledge";
export const dynamic="force-dynamic";
export default async function BrazilChatPage(){return <BrazilChat data={await brazilDashboard()}/>;}
