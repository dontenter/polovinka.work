"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Calendar,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  MessageCircleQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getGameSeoResultById,
  type GameSeoResult,
  type SeoBlock,
  type FaqGroup,
} from "@/lib/game-seo-storage";

function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

function isEmptyAnswer(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "-" || trimmed.toLowerCase() === "неприменимо" || trimmed.toLowerCase() === "нет информации";
}

function validBlockItems(block: SeoBlock) {
  return block.items.filter((item) => {
    const nameOk = !isEmptyAnswer(item.name);
    const detailOk = !isEmptyAnswer(item.detail);
    return nameOk || detailOk;
  });
}

function blockMeetsThreshold(block: SeoBlock): boolean {
  if (block.id === "levels") {
    const hasCount = !!block.meta?.count && block.meta.count.trim() !== "";
    const hasStructure = !isEmptyAnswer(block.meta?.structure || "");
    const validItems = validBlockItems(block).length;
    return validItems >= 2 || (hasCount && hasStructure);
  }
  if (block.id === "story") {
    const validItems = validBlockItems(block).length;
    const hasStructure = !isEmptyAnswer(block.meta?.structure || "");
    return validItems >= 2 || hasStructure;
  }
  return validBlockItems(block).length >= 2;
}

function validFaqItems(group: FaqGroup) {
  return group.items.filter(
    (item) => item.confirmed && !isEmptyAnswer(item.question) && !isEmptyAnswer(item.answer)
  );
}

function hasBlockContent(block: SeoBlock): boolean {
  if (block.meta?.count?.trim()) return true;
  if (!isEmptyAnswer(block.meta?.structure || "")) return true;
  return validBlockItems(block).length > 0;
}

function faqItemsWithContent(group: FaqGroup) {
  return group.items.filter((item) => !isEmptyAnswer(item.question) || !isEmptyAnswer(item.answer));
}

function hasFaqContent(group: FaqGroup): boolean {
  return faqItemsWithContent(group).length > 0;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GameSeoResultPage() {
  const params = useParams();
  const [result, setResult] = useState<GameSeoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadResult() {
      const id = params.id as string;
      if (id) {
        try {
          setLoading(true);
          setError(null);
          const data = await getGameSeoResultById(id);
          setResult(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load result");
        } finally {
          setLoading(false);
        }
      }
    }

    loadResult();
  }, [params.id]);

  const handleCopy = async () => {
    if (!result?.generatedText) return;
    await navigator.clipboard.writeText(result.generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/lab/game-seo/history">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Alert variant="destructive">
          <AlertTitle>Result Not Found</AlertTitle>
          <AlertDescription>
            The requested SEO text was not found in history.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/lab/game-seo/history">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const blocksWithContent = result.blocks.filter(hasBlockContent);
  const faqGroupsWithContent = result.faqGroups.filter(hasFaqContent);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab/game-seo/history"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
          Lab / Game SEO Text / History
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          {result.gameName}
        </h1>
        <div className="flex items-center gap-4 mt-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(result.date)}
          </span>
        </div>
      </div>

      {/* Generated Text */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>Generated SEO Text</CardTitle>
              <CardDescription>Final translated and structured text</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={result.generatedText}
            readOnly
            className="min-h-[400px] resize-y bg-muted/50 font-mono text-sm"
          />
          <Button onClick={handleCopy} className="w-full gap-2">
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Source Data */}
      <div className="space-y-6">
        {blocksWithContent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                Ответы редактора — Deep-content Blocks
                <Badge variant="secondary" className="ml-2">
                  {blocksWithContent.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {blocksWithContent.map((block) => {
                const items = validBlockItems(block);
                const meetsThreshold = blockMeetsThreshold(block);
                return (
                  <div key={block.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{block.labelRu}</h3>
                      {meetsThreshold && (
                        <Badge variant="success" className="text-xs">
                          вошло в текст
                        </Badge>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {block.id === "levels" && block.meta?.count && (
                        <li className="text-sm text-muted-foreground">
                          • {block.meta.count} {(block.meta.variant || "Levels").toLowerCase()}
                        </li>
                      )}
                      {block.id === "levels" && block.meta?.structure && (
                        <li className="text-sm text-muted-foreground">• {block.meta.structure}</li>
                      )}
                      {block.id === "story" && block.meta?.structure && items.length === 0 && (
                        <li className="text-sm text-muted-foreground">{block.meta.structure}</li>
                      )}
                      {items.map((item, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {item.name && item.detail ? (
                            <>
                              <span className="font-medium text-foreground">{item.name}</span>: {item.detail}
                            </>
                          ) : (
                            item.name || item.detail
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {faqGroupsWithContent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-accent" />
                Ответы редактора — FAQ
                <Badge variant="secondary" className="ml-2">
                  {faqGroupsWithContent.reduce((sum, g) => sum + faqItemsWithContent(g).length, 0)} пар
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {faqGroupsWithContent.map((group) => (
                <div key={group.id} className="space-y-3">
                  <h3 className="text-sm font-semibold">{group.labelRu}</h3>
                  {faqItemsWithContent(group).map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "space-y-1 p-3 rounded-lg border",
                        item.confirmed
                          ? "bg-muted/30 border-border"
                          : "bg-muted/10 border-dashed border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Q: {item.question}</p>
                        {!item.confirmed && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            не подтверждено
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">A: {item.answer}</p>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-center">
        <Link href="/lab/game-seo/history">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </Link>
      </div>
    </div>
  );
}
