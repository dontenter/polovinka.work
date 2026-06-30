"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { getGameSeoResultById, type GameSeoResult } from "@/lib/game-seo-storage";

function PreviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const field = searchParams.get("field") === "after" ? "after" : "before";

  const [result, setResult] = useState<GameSeoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) {
        setError("Не указан ID результата");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getGameSeoResultById(id);
        if (!data) {
          setError("Результат не найден");
          return;
        }
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить результат"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Alert variant="destructive">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href={id ? `/lab/game-seo/history/${id}` : "/lab/game-seo/history"}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const html = field === "after" ? result?.fullSeoAfter : result?.fullSeoBefore;
  const title = field === "after" ? "Full SEO After" : "Full SEO Before";

  return (
    <>
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            {result && (
              <p className="text-sm text-muted-foreground">{result.gameName}</p>
            )}
          </div>
          <Link href={id ? `/lab/game-seo/history/${id}` : "/lab/game-seo/history"}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        {!html || html.trim() === "" ? (
          <p className="text-muted-foreground">Текст отсутствует</p>
        ) : (
          <div
            className="seo-preview-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </>
  );
}

export default function GameSeoPreviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Загрузка...</p>
          </div>
        }
      >
        <PreviewContent />
      </Suspense>
    </div>
  );
}
