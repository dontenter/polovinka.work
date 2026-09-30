import Link from "next/link";
import { ArrowUpRight, MessageSquare, Sunrise } from "lucide-react";
import { requireLifeSession } from "@/lib/life-auth";

export default async function LifePage() {
  await requireLifeSession("/life");
  return <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
    <p className="text-sm tracking-widest uppercase text-muted-foreground mb-2">Personal space</p>
    <form action="/api/auth/life/logout" method="POST" className="float-right"><button className="text-sm text-muted-foreground underline">Выйти из Life</button></form>
    <h1 className="text-4xl font-semibold tracking-tight">Life</h1>
    <p className="mt-3 text-muted-foreground max-w-xl">Место для личных инструментов, полезных находок и планов.</p>
    <Link href="/life/telegram" className="mt-10 block max-w-xl rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/30 hover:bg-muted/20">
      <div className="flex items-center justify-between"><MessageSquare className="h-6 w-6"/><ArrowUpRight className="h-5 w-5 text-muted-foreground"/></div>
      <h2 className="mt-6 text-xl font-medium">Telegram Summary</h2>
      <p className="mt-2 text-sm text-muted-foreground">Главное из выбранных чатов: AI, бизнес и события на Бали. Дайджесты со ссылками на обсуждения.</p>
      <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Sunrise className="h-4 w-4"/>Планируемое время — 08:00 · Бали</p>
      <p className="mt-4 text-sm font-medium">Открыть архив →</p>
    </Link>
  </main>;
}
