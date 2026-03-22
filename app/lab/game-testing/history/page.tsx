"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2, ArrowLeft, Search, Calendar, Trash2, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAllGameTestResults,
  deleteGameTestResult,
  type GameTestResult,
} from "@/lib/game-testing-storage";

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

function getRatingBadge(score: number) {
  if (score === 5) return { label: "5", variant: "success" as const, color: "bg-green-100 text-green-700" };
  if (score === 4) return { label: "4", variant: "accent" as const, color: "bg-blue-100 text-blue-700" };
  if (score === 3) return { label: "3", variant: "warning" as const, color: "bg-yellow-100 text-yellow-700" };
  if (score === 2) return { label: "2", variant: "secondary" as const, color: "bg-orange-100 text-orange-700" };
  return { label: "1", variant: "destructive" as const, color: "bg-red-100 text-red-700" };
}

export default function GameTestingHistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<GameTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAllGameTestResults();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setIsLoading(false);
      }
    }

    loadResults();
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase();
    return results.filter((r) =>
      r.gameName.toLowerCase().includes(query)
    );
  }, [results, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;

    try {
      setDeletingId(id);
      await deleteGameTestResult(id);
      setResults((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete result");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab/game-testing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Game Testing
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
          Lab / Game Testing
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 sm:h-9 sm:w-9 text-accent" />
          Test History
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          List of saved game testing results
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by game name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading results...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200">
          <CardContent className="py-12 text-center">
            <p className="text-red-600">Error: {error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredResults.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No results found" : "No saved results"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/lab/game-testing")}
            >
              Start New Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {!isLoading && !error && filteredResults.length > 0 && (
        <div className="space-y-4">
          {filteredResults.map((result) => {
            const ratingBadge = getRatingBadge(result.ratingScore);
            const isDeleting = deletingId === result.id;
            return (
              <Card
                key={result.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/lab/game-testing/history/${result.id}`)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{result.gameName}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(result.date)}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge className={ratingBadge.color}>
                          Rating: {ratingBadge.label}
                        </Badge>
                        {result.hasFailedBasicChecks && (
                          <Badge variant="destructive">
                            Issues Found
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/lab/game-testing/history/${result.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(result.id);
                        }}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
