"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "pending" | "clear" | "flagged" | "unavailable";
type Game = {
  id: string; title: string; published_at: string; game_url: string; launch_url: string | null;
  first_seen_at: string; status: Status; reason: string | null; reviewed_at: string | null;
};
const historyFilters: { id: Exclude<Status, "pending">; label: string }[] = [
  { id: "flagged", label: "Flagged" },
  { id: "clear", label: "No prohibited content" },
  { id: "unavailable", label: "Could not assess" },
];
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AssessorPage() {
  const [view, setView] = useState<"review" | "history">("review");
  const [historyStatus, setHistoryStatus] = useState<Exclude<Status, "pending">>("flagged");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [frameUrls, setFrameUrls] = useState<Record<string, string | null>>({});
  const requestedFrames = useRef(new Set<string>());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const syncingRef = useRef(false);
  const loadSequence = useRef(0);

  const status: Status = view === "review" ? "pending" : historyStatus;
  const current = view === "review" ? games.find(game => game.id === currentId) ?? games[0] : undefined;
  const nextGame = current ? games.find(game => game.id !== current.id) : undefined;
  const stagedGames = [current, nextGame].filter((game): game is Game => Boolean(game));

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status, page: String(page), search: view === "history" ? query : "" });
      const response = await fetch("/api/lab/assessor?" + params, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load games");
      if (sequence !== loadSequence.current) return;
      setGames(data.games);
      setTotal(data.total);
      if (view === "review") {
        setCurrentId(previous => previous && data.games.some((game: Game) => game.id === previous)
          ? previous : data.games[0]?.id ?? null);
      }
    } catch (cause) {
      if (sequence === loadSequence.current) setError(cause instanceof Error ? cause.message : "Could not load games");
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [status, page, query, view, reloadVersion]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError("");
    try {
      const response = await fetch("/api/lab/assessor/sync", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check for new games");
      if (data.status === "updated") {
        setSyncMessage(data.added ? "Games processed: " + data.added : "No new games found");
        setReloadVersion(value => value + 1);
      } else setSyncMessage("Catalog checked within the last 5 minutes");
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : "Could not check for new games");
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
    if (view !== "review") return;
    for (const id of [current?.id, nextGame?.id]) {
      if (!id || requestedFrames.current.has(id)) continue;
      requestedFrames.current.add(id);
      void fetch("/api/lab/assessor/" + id + "/launch", { cache: "no-store" })
        .then(async response => {
          const data = await response.json();
          if (!response.ok || typeof data.url !== "string") throw new Error("Could not load game");
          setFrameUrls(previous => ({ ...previous, [id]: data.url }));
        })
        .catch(() => setFrameUrls(previous => ({ ...previous, [id]: null })));
    }
  }, [view, current?.id, nextGame?.id, frameUrls]);

  function retryFrame(id: string) {
    requestedFrames.current.delete(id);
    setFrameUrls(previous => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  async function answer(decision: Exclude<Status, "pending">) {
    if (!current || saving) return;
    const reviewedGame = current;
    const reviewedId = reviewedGame.id;
    const nextId = nextGame?.id ?? null;
    const reviewedNote = note;
    setSaving(true);
    setError("");
    setGames(previous => previous.filter(game => game.id !== reviewedId));
    setCurrentId(nextId);
    setTotal(previous => Math.max(0, previous - 1));
    setNote("");
    try {
      const response = await fetch("/api/lab/assessor/" + reviewedId, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, reason: reviewedNote.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save review");
      setReloadVersion(value => value + 1);
    } catch (cause) {
      setGames(previous => [reviewedGame, ...previous.filter(game => game.id !== reviewedId)]);
      setCurrentId(reviewedId);
      setTotal(previous => previous + 1);
      setNote(reviewedNote);
      setError(cause instanceof Error ? cause.message : "Could not save review");
    } finally { setSaving(false); }
  }

  function switchView(next: "review" | "history") {
    setView(next); setPage(1); setGames([]); setError(""); setNote("");
  }

  return (
    <main className="container mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lab / Content review</p>
          <h1 className="text-3xl font-semibold tracking-tight">Content Assessor</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
          <RefreshCw className={"mr-2 h-4 w-4 " + (syncing ? "animate-spin" : "")} />
          {syncing ? "Checking…" : "Check for new games"}
        </Button>
      </div>
      <div className="mb-5 flex items-center gap-2 border-b pb-4">
        <button type="button" onClick={() => switchView("review")}
          className={"rounded-md px-4 py-2 text-sm font-medium " + (view === "review" ? "bg-foreground text-background" : "hover:bg-muted")}>
          Review {view === "review" && !loading ? "(" + total + ")" : ""}
        </button>
        <button type="button" onClick={() => switchView("history")}
          className={"rounded-md px-4 py-2 text-sm font-medium " + (view === "history" ? "bg-foreground text-background" : "hover:bg-muted")}>
          History
        </button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {syncError && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{syncError}</p>}
      {syncMessage && !syncError && <p role="status" className="mb-4 text-xs text-muted-foreground">{syncMessage}</p>}

      {view === "review" ? (
        current ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.85fr)]">
            <section className="overflow-hidden rounded-xl border bg-black">
              <div className="flex items-center justify-between gap-3 bg-card px-4 py-3 text-foreground">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{current.title}</h2>
                  <p className="text-xs text-muted-foreground">Added to queue {formatDate(current.first_seen_at)} · {current.id}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{total} waiting</span>
              </div>
              <div className="relative h-[65vh] min-h-[520px] max-h-[900px]">
                {stagedGames.map(game => frameUrls[game.id] && (
                  <iframe key={game.id} title={game.title} src={frameUrls[game.id] ?? undefined}
                    className={"absolute inset-0 h-full w-full border-0 " + (game.id === current.id ? "z-10" : "pointer-events-none opacity-0")}
                    aria-hidden={game.id !== current.id} tabIndex={game.id === current.id ? 0 : -1}
                    loading="eager" allow="autoplay; fullscreen; gamepad; clipboard-read; clipboard-write"
                    sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-orientation-lock allow-presentation"
                    referrerPolicy="no-referrer" allowFullScreen />
                ))}
                {!frameUrls[current.id] && (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/70">
                    <span>{frameUrls[current.id] === null ? "Could not load this game." : "Loading game…"}</span>
                    {frameUrls[current.id] === null && <Button variant="secondary" size="sm" onClick={() => retryFrame(current.id)}>Retry</Button>}
                  </div>
                )}
              </div>
            </section>
            <aside className="flex h-fit flex-col rounded-xl border bg-card p-5 lg:sticky lg:top-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content review</p>
              <h2 className="text-xl font-semibold leading-snug">Does this game contain prohibited content?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Choose an answer to save the decision and load the next game.</p>
              <label htmlFor="assessor-note" className="mt-6 text-sm font-medium">Note (optional)</label>
              <textarea id="assessor-note" value={note} onChange={event => setNote(event.target.value)}
                maxLength={2000} rows={3} disabled={saving} placeholder="Describe what you found, if useful"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <div className="mt-5 space-y-2">
                <Button className="w-full justify-start" variant="outline" disabled={saving} onClick={() => void answer("clear")}>
                  <CheckCircle2 className="mr-3 h-4 w-4" /> No
                </Button>
                <Button className="w-full justify-start" variant="outline" disabled={saving} onClick={() => void answer("flagged")}>
                  <AlertTriangle className="mr-3 h-4 w-4" /> Yes / Unsure
                </Button>
                <Button className="w-full justify-start" variant="outline" disabled={saving} onClick={() => void answer("unavailable")}>
                  <XCircle className="mr-3 h-4 w-4" /> Could not assess
                </Button>
              </div>
              {saving && <p className="mt-3 text-sm text-muted-foreground">Saving decision…</p>}
            </aside>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            {loading || syncing ? "Loading review queue…" : "No games waiting for review."}
          </div>
        )
      ) : (
        <section>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {historyFilters.map(filter => (
              <button key={filter.id} type="button" onClick={() => { setHistoryStatus(filter.id); setPage(1); }}
                className={"rounded-md border px-3 py-2 text-sm " + (historyStatus === filter.id ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>
                {filter.label}
              </button>
            ))}
          </div>
          <form onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }} className="mb-5 flex gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search games" className="pl-9" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
          <p className="mb-3 text-sm text-muted-foreground">{loading ? "Loading…" : total + " games"}</p>
          {!loading && games.length === 0 && <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No games found.</div>}
          <div className="divide-y rounded-xl border">
            {games.map(game => (
              <div key={game.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="font-medium">{game.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reviewed {game.reviewed_at ? formatDate(game.reviewed_at) : "—"} · Added to queue {formatDate(game.first_seen_at)}
                  </p>
                  {game.reason && <p className="mt-2 text-sm">{game.reason}</p>}
                </div>
                <span className="text-xs text-muted-foreground">ID {game.id}</span>
              </div>
            ))}
          </div>
          {total > 30 && <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">{page} / {Math.ceil(total / 30)}</span>
            <Button variant="outline" disabled={page >= Math.ceil(total / 30) || loading} onClick={() => setPage(page + 1)}>Next</Button>
          </div>}
        </section>
      )}
    </main>
  );
}
