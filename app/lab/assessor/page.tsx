"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, RefreshCw, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Status = "pending" | "clear" | "flagged" | "unavailable";
type Game = {
  id: string; title: string; published_at: string; game_url: string; launch_url: string | null;
  status: Status; reason: string | null; reviewed_at: string | null;
};

const tabs: { id: Status; label: string }[] = [
  { id: "pending", label: "На проверке" },
  { id: "flagged", label: "Сомнительные" },
  { id: "clear", label: "Без нарушений" },
  { id: "unavailable", label: "Не удалось проверить" },
];
const date = (value: string) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AssessorPage() {
  const [status, setStatus] = useState<Status>("pending");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [choice, setChoice] = useState<Status | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const syncingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status, page: String(page), search: query });
      const response = await fetch(`/api/lab/assessor?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить игры");
      setGames(data.games);
      setTotal(data.total);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось загрузить игры"); }
    finally { setLoading(false); }
  }, [status, page, query, reloadVersion]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError("");
    try {
      const response = await fetch("/api/lab/assessor/sync", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось проверить новые игры");
      if (data.status === "updated") {
        setSyncMessage(data.added ? `Добавлено игр: ${data.added}` : "Новых игр пока нет");
        setReloadVersion(value => value + 1);
      } else {
        setSyncMessage("Каталог уже проверялся за последние 5 минут");
      }
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : "Не удалось проверить новые игры");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void sync();
    const timer = window.setInterval(() => void sync(), 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") void sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [sync]);
  useEffect(() => {
    if (!openedAt) return;
    const update = () => setRemaining(Math.max(0, 30 - Math.floor((Date.now() - openedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [openedAt]);

  function selectTab(next: Status) {
    setStatus(next); setPage(1); setActiveId(null); setOpenedAt(null); setChoice(null); setReason("");
  }

  function openGame(game: Game) {
    setActiveId(game.id);
    setOpenedAt(Date.now());
    setRemaining(30);
    setChoice(null);
    setReason("");
  }

  async function save(game: Game) {
    if (!choice || remaining > 0 || saving) return;
    if ((choice === "flagged" || choice === "unavailable") && !reason.trim()) {
      setError("Для этого решения укажите причину."); return;
    }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/lab/assessor/${game.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: choice, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить решение");
      setActiveId(null); setOpenedAt(null); setChoice(null); setReason("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить решение"); }
    finally { setSaving(false); }
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lab / Content review</p>
          <h1 className="text-3xl font-semibold tracking-tight">Кабинет ассесора</h1>
          <p className="mt-2 text-sm text-muted-foreground">Откройте игру, посмотрите её 30 секунд и отметьте, есть ли запрещённый контент.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}><RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Проверяем…" : "Проверить новые игры"}</Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Статус проверки">
        {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={status === tab.id}
          onClick={() => selectTab(tab.id)} className={`rounded-md border px-3 py-2 text-sm transition-colors ${status === tab.id ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>{tab.label}</button>)}
      </div>

      <form onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }} className="mb-5 flex gap-2">
        <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Поиск по названию" className="pl-9" /></div>
        <Button type="submit" variant="outline">Найти</Button>
      </form>

      {error && <p role="alert" className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {syncError && <p role="alert" className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{syncError}</p>}
      {syncMessage && !syncError && <p role="status" className="mb-5 text-sm text-muted-foreground">{syncMessage}</p>}
      <p className="mb-4 text-sm text-muted-foreground">{loading ? "Загрузка…" : `Игр: ${total}`}</p>
      {!loading && games.length === 0 && <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">{syncing ? "Проверяем каталог Playgama…" : "Здесь пока нет игр."}</div>}
      <div className="space-y-4">
        {games.map(game => <Card key={game.id} className="overflow-hidden"><CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{game.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Опубликована {date(game.published_at)} · ID {game.id}</p>
              {game.reviewed_at && <p className="mt-1 text-xs text-muted-foreground">Проверена {date(game.reviewed_at)}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={game.game_url} target="_blank" rel="noopener noreferrer" onClick={() => openGame(game)}
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Открыть игру <ExternalLink className="ml-2 h-4 w-4" /></a>
              {game.launch_url && <a href={game.launch_url} target="_blank" rel="noopener noreferrer" onClick={() => openGame(game)} className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted">Прямая ссылка</a>}
            </div>
          </div>
          {game.reason && <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm"><span className="font-medium">Причина: </span>{game.reason}</p>}
          {activeId === game.id && <div className="mt-5 border-t pt-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium"><Clock3 className="h-4 w-4" />{remaining > 0 ? `До решения: ${remaining} сек.` : "30 секунд прошло. Есть ли запрещённый контент?"}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={choice === "clear" ? "default" : "outline"} onClick={() => setChoice("clear")} disabled={remaining > 0}><CheckCircle2 className="mr-2 h-4 w-4" />Нет</Button>
              <Button type="button" variant={choice === "flagged" ? "default" : "outline"} onClick={() => setChoice("flagged")} disabled={remaining > 0}><AlertTriangle className="mr-2 h-4 w-4" />Есть / сомнительно</Button>
              <Button type="button" variant={choice === "unavailable" ? "default" : "outline"} onClick={() => setChoice("unavailable")} disabled={remaining > 0}><XCircle className="mr-2 h-4 w-4" />Не удалось проверить</Button>
            </div>
            {choice && <div className="mt-4 max-w-xl space-y-3">
              <label htmlFor={`reason-${game.id}`} className="block text-sm font-medium">Причина {choice === "clear" ? "(необязательно)" : "(обязательно)"}</label>
              <textarea id={`reason-${game.id}`} value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Что именно вы увидели?" />
              <Button type="button" onClick={() => void save(game)} disabled={saving || ((choice === "flagged" || choice === "unavailable") && !reason.trim())}>{saving ? "Сохранение…" : "Сохранить решение"}</Button>
            </div>}
          </div>}
        </CardContent></Card>)}
      </div>
      {total > 30 && <div className="mt-7 flex items-center justify-center gap-3">
        <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Назад</Button>
        <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / 30)}</span>
        <Button variant="outline" disabled={page >= Math.ceil(total / 30) || loading} onClick={() => setPage(page + 1)}>Далее</Button>
      </div>}
    </main>
  );
}
