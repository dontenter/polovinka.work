"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Search,
  Calendar,
  Trash2,
  Eye,
  Loader2,
  Lock,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteGameSeoResult,
  getGameSeoResults,
  type GameSeoListItem,
} from "@/lib/game-seo-storage";

const DELETE_PASSWORD = "delete";
const ITEMS_PER_PAGE = 25;

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateNoTime = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayNoTime = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );

  if (dateNoTime.getTime() === todayNoTime.getTime()) {
    return "Today";
  } else if (dateNoTime.getTime() === yesterdayNoTime.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }
}

interface GroupedResults {
  dateKey: string;
  dateLabel: string;
  results: GameSeoListItem[];
}

function groupResultsByDate(results: GameSeoListItem[]): GroupedResults[] {
  const groups = new Map<string, GameSeoListItem[]>();

  for (const result of results) {
    const date = new Date(result.date);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(result);
  }

  const sortedKeys = Array.from(groups.keys()).sort().reverse();

  return sortedKeys.map((key) => {
    const results = groups.get(key)!;
    return {
      dateKey: key,
      dateLabel: formatDateHeader(results[0].date),
      results: results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  });
}

export default function GameSeoHistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [displayedResults, setDisplayedResults] = useState<GameSeoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, GameSeoListItem[]>>(new Map());

  // Prefetch a page into cache without updating UI
  const prefetchPage = useCallback(async (page: number, search: string) => {
    const key = `${search}|${page}`;
    if (cacheRef.current.has(key)) return;
    if (page < 1) return;

    try {
      const data = await getGameSeoResults(page, ITEMS_PER_PAGE, search || undefined);
      if (data.results.length > 0) {
        cacheRef.current.set(key, data.results);
      }
    } catch (e) {
      // silently fail prefetch
    }
  }, []);

  // Load a specific page (from cache or API)
  const loadPageData = useCallback(
    async (page: number, search: string, showLoading = true) => {
      const key = `${search}|${page}`;

      if (cacheRef.current.has(key)) {
        setDisplayedResults(cacheRef.current.get(key)!);
        setIsLoading(false);
        prefetchPage(page + 1, search);
        return;
      }

      if (showLoading) setIsLoading(true);
      try {
        const data = await getGameSeoResults(page, ITEMS_PER_PAGE, search || undefined);
        cacheRef.current.set(key, data.results);
        setDisplayedResults(data.results);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        if (showLoading) setIsLoading(false);
      }

      prefetchPage(page + 1, search);
    },
    [prefetchPage]
  );

  // Load current page whenever page or search changes
  useEffect(() => {
    loadPageData(currentPage, searchQuery);
  }, [currentPage, searchQuery, loadPageData]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  }, [total]);

  const groupedResults = useMemo(() => {
    return groupResultsByDate(displayedResults);
  }, [displayedResults]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    cacheRef.current.clear();
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
    setPasswordInput("");
    setPasswordError(false);
    setShowPasswordModal(true);
  };

  const handleConfirmDelete = async () => {
    if (passwordInput !== DELETE_PASSWORD) {
      setPasswordError(true);
      return;
    }

    if (!pendingDeleteId) return;

    try {
      setDeletingId(pendingDeleteId);
      setShowPasswordModal(false);
      await deleteGameSeoResult(pendingDeleteId);

      // Invalidate cache and reload current page to reflect deletion
      cacheRef.current.clear();
      await loadPageData(currentPage, searchQuery);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete result");
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
      setPasswordInput("");
    }
  };

  const handleCancelDelete = () => {
    setShowPasswordModal(false);
    setPendingDeleteId(null);
    setPasswordInput("");
    setPasswordError(false);
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab/game-seo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Game SEO Text
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
          Lab / Game SEO Text
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <FileText className="h-8 w-8 sm:h-9 sm:w-9 text-accent" />
          History
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          List of generated game SEO texts
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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              disabled={isLoading && displayedResults.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && displayedResults.length === 0 && (
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
              onClick={() => loadPageData(currentPage, searchQuery)}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No results found" : "No saved results"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/lab/game-seo")}
            >
              Generate New Text
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped Results */}
      {!isLoading && !error && groupedResults.length > 0 && (
        <div className="space-y-8">
          {groupedResults.map((group) => (
            <div key={group.dateKey}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {group.dateLabel}
                </h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {group.results.length} result{group.results.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Results for this date */}
              <div className="space-y-3">
                {group.results.map((result) => {
                  const isDeleting = deletingId === result.id;
                  return (
                    <Card
                      key={result.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/lab/game-seo/history/${result.id}`)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{result.gameName}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDateTime(result.date)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/lab/game-seo/history/${result.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              onClick={(e) => handleDeleteClick(result.id, e)}
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
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100">
                  <Lock className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Confirm Deletion</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelDelete}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-muted-foreground mb-4">
              Enter the password to delete this record.
            </p>

            <Input
              type="password"
              placeholder="Enter password..."
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmDelete();
                }
              }}
              className={passwordError ? "border-red-500" : ""}
              autoFocus
            />

            {passwordError && (
              <p className="text-red-500 text-sm mt-2">
                Incorrect password. Please try again.
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
