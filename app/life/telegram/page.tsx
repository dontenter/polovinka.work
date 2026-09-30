import { TelegramDigest } from "@/components/telegram-digest";
import Link from "next/link";
import { requireLifeSession } from "@/lib/life-auth";
import { lifeStorageConfigured, listDigests, readDigest } from "@/lib/life-storage";

function readable(id: string) {
  return `${id.slice(6, 8)}.${id.slice(4, 6)}.${id.slice(0, 4)}`;
}
export default async function TelegramPage({ searchParams }: { searchParams: Promise<{ id?: string; cursor?: string }> }) {
  await requireLifeSession("/life/telegram");
  const query = await searchParams;
  let archive: Awaited<ReturnType<typeof listDigests>> = { items: [], cursor: undefined };
  let digest: Awaited<ReturnType<typeof readDigest>> = null;
  let error = "";
  if (lifeStorageConfigured()) {
    try {
      archive = await listDigests(query.cursor);
      const id = query.id ?? archive.items[0];
      if (id) digest = await readDigest(id);
      if (query.id && !digest) error = "Этот дайджест не найден.";
    } catch { error = "Архив временно недоступен. Попробуй открыть его позже."; }
  }
  return <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-12">
    <Link href="/life" className="text-sm text-muted-foreground hover:text-foreground">← Life</Link>
    <h1 className="mt-5 text-3xl font-semibold">Telegram Summary</h1>
    <p className="mt-3 text-muted-foreground">AI Game Universe · PG • Business · Афиша Бали</p>
    <p className="mt-2 text-sm text-muted-foreground">Планируемое время — 08:00 по Бали. Автоматическая доставка ещё не включена.</p>
    {error ? <p role="alert" className="mt-8 rounded-xl border p-6">{error}</p> : null}
    {!error && !archive.items.length && !digest ? <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
      <h2 className="font-medium">Здесь появится первый дайджест</h2>
      <p className="mt-2 text-sm text-muted-foreground">После подключения архива саммари будут доступны по датам.</p>
    </div> : null}
    <div className="mt-8 grid gap-8 md:grid-cols-[180px_1fr]">
      <aside className="flex flex-wrap md:flex-col gap-2" aria-label="Даты саммари">
        {archive.items.map(id => <Link key={id} href={{ pathname: "/life/telegram", query: { id, ...(query.cursor ? { cursor: query.cursor } : {}) } }} aria-current={digest?.id === id ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm ${digest?.id === id ? "bg-muted" : "hover:bg-muted/50"}`}>{readable(id)}</Link>)}
        {archive.cursor ? <Link href={{ pathname: "/life/telegram", query: { cursor: archive.cursor } }} className="text-sm underline p-2">Следующие даты →</Link> : null}
      </aside>
      {digest ? <TelegramDigest digest={digest}/> : null}
    </div>
  </main>;
}
