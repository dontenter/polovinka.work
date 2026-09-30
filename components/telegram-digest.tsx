import type { LifeDigest } from "@/lib/life-storage";

type Section = { title: string; lines: string[] };

function sections(markdown: string): Section[] {
  const result: Section[] = [];
  let current: Section = { title: "Коротко главное", lines: [] };
  function flush() {
    if (current.lines.some(line => line.trim())) result.push(current);
  }
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    // Older saved digests use numbered channel headings rather than Markdown headings.
    const channel = line.match(/^(?:\d+[).]\s+|#{2,3}\s+)?(AI Game Universe|PG\s*•\s*Business|Бали Чат Мероприятия Афиша\s*\|\s*Балифорум|Афиша Бали)(?:\s*[—–-].*)?$/i);
    const heading = channel?.[1] ?? line.match(/^#{2,3}\s+(.+)$/)?.[1];
    if (heading || /^(?:#{1,3}\s*)?Коротко главное\s*$/i.test(line)) {
      flush();
      current = { title: heading ?? "Коротко главное", lines: [] };
    } else if (line === "---") {
      flush();
      current = { title: "Примечания", lines: [] };
    } else if (!/^#\s/.test(line) && !/^Период:/.test(line)) {
      current.lines.push(raw);
    }
  }
  flush();
  return result;
}

function Inline({ text }: { text: string }) {
  // Only Telegram source URLs become links. Everything else stays escaped React text.
  const pieces = text.split(/(\[[^\]\n]+\]\(https:\/\/t\.me\/[^\s)]+\)|https:\/\/t\.me\/[^\s)\]<>]+|\*\*[^*\n]+\*\*)/g);
  return <>{pieces.map((part, i) => {
    const markdownLink = part.match(/^\[([^\]]+)\]\((https:\/\/t\.me\/[^)]+)\)$/);
    const url = markdownLink?.[2] ?? (/^https:\/\/t\.me\//.test(part) ? part.replace(/[.,;:!?]+$/, "") : null);
    if (url) return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-accent underline underline-offset-4">{markdownLink?.[1] ?? "Источник ↗"}</a>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  })}</>;
}

function Content({ lines }: { lines: string[] }) {
  const blocks: { list: boolean; items: string[] }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.list) last.items.push(bullet[1]);
      else blocks.push({ list: true, items: [bullet[1]] });
    } else {
      blocks.push({ list: false, items: [line] });
    }
  }
  return <div className="space-y-4 text-sm leading-7 break-words">{blocks.map((block, i) => block.list ?
    <ul key={i} className="list-disc space-y-4 pl-5 marker:text-muted-foreground">{block.items.map((item, j) => <li key={j} className="pl-1"><Inline text={item}/></li>)}</ul> :
    <p key={i}><Inline text={block.items[0]}/></p>
  )}</div>;
}

export function TelegramDigest({ digest }: { digest: LifeDigest }) {
  const format = (date: string) => new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar",
  }).format(new Date(date));
  return <article className="min-w-0 space-y-6">
    <header className="px-1">
      <p className="text-sm text-muted-foreground">{format(digest.from)} — {format(digest.to)} · Бали</p>
      <p className="mt-1 text-xs text-muted-foreground">{digest.messageCount} сообщений · {digest.model}</p>
    </header>
    {sections(digest.markdown).map((section, i) => <section key={i} aria-labelledby={`digest-section-${i}`} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-5 py-4 sm:px-7">
        <h2 id={`digest-section-${i}`} className="text-lg font-semibold tracking-tight">{section.title}</h2>
      </div>
      <div className="p-5 sm:p-7"><Content lines={section.lines}/></div>
    </section>)}
  </article>;
}
