"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Gamepad2,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Trophy,
  Settings,
  Star,
  Users,
  ShoppingCart,
  Share2,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Languages,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getGameTestResultById,
  type GameTestResult,
} from "@/lib/game-testing-storage";
import {
  REQUIREMENTS,
  BASIC_CHECK_ITEMS,
  FEATURE_CHECK_ITEMS,
  generateFeedback,
  type SelectedIssue,
} from "@/lib/requirements";

// Feature config
const FEATURES_CONFIG = [
  { id: "multiplayer", name: "Мультиплеер", icon: Users },
  { id: "leaderboards", name: "Лидерборды", icon: Trophy },
  { id: "iap", name: "Ин-апы", icon: ShoppingCart },
  { id: "social", name: "Социальный шеринг", icon: Share2 },
];

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
  if (score >= 4.5) return { label: "5 - Excellent", color: "text-green-600", bg: "bg-green-50" };
  if (score >= 3.5) return { label: "4 - Good", color: "text-blue-600", bg: "bg-blue-50" };
  if (score >= 2.5) return { label: "3 - Average", color: "text-yellow-600", bg: "bg-yellow-50" };
  if (score >= 1.5) return { label: "2 - Below Average", color: "text-orange-600", bg: "bg-orange-50" };
  return { label: "1 - Poor", color: "text-red-600", bg: "bg-red-50" };
}

// Component to display selected issues for a failed check
function FailedCheckDetails({ checkId, issueIndices }: { checkId: string; issueIndices: number[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const checkItem = BASIC_CHECK_ITEMS.find((item) => item.id === checkId);
  const requirement = REQUIREMENTS.find((r) => r.id === checkItem?.requirementId);

  if (!checkItem || !requirement || issueIndices.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="ml-6 mt-2 pl-4 border-l-2 border-red-200 dark:border-red-800">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {issueIndices.length} issue(s) selected
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-1">
            {issueIndices.map((index) => {
              const subReq = requirement.sub_requirements[index];
              return subReq ? (
                <li key={index} className="text-sm text-muted-foreground pl-6">
                  • {subReq.issue}
                </li>
              ) : null;
            })}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Component to display selected issues for a failed feature check
function FailedFeatureCheckDetails({
  featureId,
  itemId,
  issueIndices,
}: {
  featureId: string;
  itemId: string;
  issueIndices: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const featureItems = FEATURE_CHECK_ITEMS[featureId as keyof typeof FEATURE_CHECK_ITEMS];
  const item = featureItems?.find((i) => i.id === itemId);
  const requirement = REQUIREMENTS.find((r) => r.id === item?.requirementId);

  if (!item || !requirement || issueIndices.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="ml-6 mt-2 pl-4 border-l-2 border-red-200 dark:border-red-800">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:underline">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {issueIndices.length} issue(s) selected
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-1">
            {issueIndices.map((index) => {
              const subReq = requirement.sub_requirements[index];
              return subReq ? (
                <li key={index} className="text-sm text-muted-foreground pl-6">
                  • {subReq.issue}
                </li>
              ) : null;
            })}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Feedback display component
function FeedbackSection({ 
  selectedIssues, 
  failedChecks,
  savedFeedbackText,
}: { 
  selectedIssues: SelectedIssue[];
  failedChecks: { requirementId: number; itemLabel?: string }[];
  savedFeedbackText?: string;
}) {
  const [language, setLanguage] = useState<"en" | "ru">("en");
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayText, setDisplayText] = useState(savedFeedbackText || "");

  // Generate base feedback if no saved feedback
  const baseFeedback = generateFeedback(selectedIssues, failedChecks, language);

  // Initialize display text
  useEffect(() => {
    if (savedFeedbackText) {
      setDisplayText(savedFeedbackText);
    } else {
      setDisplayText(baseFeedback);
    }
  }, [savedFeedbackText, baseFeedback]);

  // Handle language switch with translation
  const handleLanguageSwitch = async () => {
    const newLanguage = language === "en" ? "ru" : "en";
    
    if (!displayText.trim()) {
      setLanguage(newLanguage);
      const newFeedback = generateFeedback(selectedIssues, failedChecks, newLanguage);
      setDisplayText(newFeedback);
      return;
    }
    
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: displayText,
          targetLanguage: newLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If API key not configured, fallback to regenerating base feedback
        if (data.error?.includes("API key not configured")) {
          const newFeedback = generateFeedback(selectedIssues, failedChecks, newLanguage);
          setDisplayText(newFeedback);
          setLanguage(newLanguage);
          return;
        }
        throw new Error(data.error || "Failed to translate");
      }

      setDisplayText(data.translatedText);
      setLanguage(newLanguage);
    } catch (error) {
      // Fallback: regenerate base feedback on error
      const newFeedback = generateFeedback(selectedIssues, failedChecks, newLanguage);
      setDisplayText(newFeedback);
      setLanguage(newLanguage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (selectedIssues.length === 0 && failedChecks.length === 0 && !savedFeedbackText) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Generated Feedback for Developer</CardTitle>
              <CardDescription>Based on selected issues</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLanguageSwitch}
            disabled={isTranslating}
            className="gap-1"
          >
            <Languages className="h-4 w-4" />
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              language === "en" ? "English" : "Русский"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={displayText}
          readOnly
          disabled={isTranslating}
          className="min-h-[300px] resize-none font-mono text-sm bg-muted/30"
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
  );
}

export default function GameTestResultPage() {
  const params = useParams();
  const [result, setResult] = useState<GameTestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResult() {
      const id = params.id as string;
      if (id) {
        try {
          setLoading(true);
          setError(null);
          const data = await getGameTestResultById(id);
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

  // Prepare selected issues from result (basic checks)
  const basicSelectedIssues = result?.basicCheckIssues
    ? Object.entries(result.basicCheckIssues).flatMap(([checkId, indices]) => {
        const checkItem = BASIC_CHECK_ITEMS.find((item) => item.id === checkId);
        if (!checkItem) return [];
        return indices.map((index) => ({
          requirementId: checkItem.requirementId,
          issueIndex: index,
        }));
      })
    : [];

  // Prepare selected issues from result (feature checks)
  const featureSelectedIssues = result?.features
    ? result.features.flatMap((feature) => {
        if (!feature.failedItems) return [];
        return Object.entries(feature.failedItems).flatMap(([itemId, indices]) => {
          const featureItems = FEATURE_CHECK_ITEMS[feature.id as keyof typeof FEATURE_CHECK_ITEMS];
          const item = featureItems?.find((i) => i.id === itemId);
          if (!item) return [];
          return indices.map((index) => ({
            requirementId: item.requirementId,
            issueIndex: index,
          }));
        });
      })
    : [];

  // Combine all issues
  const allSelectedIssues = [...basicSelectedIssues, ...featureSelectedIssues];

  // Prepare failed checks without specific issues (basic checks)
  const basicFailedChecksWithoutIssues = result?.basicChecks
    ? Object.entries(result.basicChecks)
        .filter(([checkId, status]) => {
          if (status !== false) return false;
          // Check if this failed check has specific issues selected
          const hasIssues = (result.basicCheckIssues?.[checkId]?.length ?? 0) > 0;
          return !hasIssues;
        })
        .map(([checkId]) => {
          const checkItem = BASIC_CHECK_ITEMS.find((item) => item.id === checkId);
          return checkItem ? { requirementId: checkItem.requirementId } : null;
        })
        .filter((item): item is { requirementId: number } => item !== null)
    : [];

  // Prepare failed checks without specific issues (feature checks)
  const featureFailedChecksWithoutIssues = result?.features
    ? result.features.flatMap((feature) => {
        if (!feature.applicable) return [];
        // Find items that are not checked (failed) and not in failedItems or with empty issues
        const allItemIds = FEATURE_CHECK_ITEMS[feature.id as keyof typeof FEATURE_CHECK_ITEMS]?.map(i => i.id) || [];
        return allItemIds
          .filter((itemId) => {
            // Not in checked items (so it's failed or not answered)
            const isChecked = feature.checkedItems.includes(itemId);
            if (isChecked) return false;
            // Check if it has specific issues selected
            const hasIssues = (feature.failedItems?.[itemId]?.length ?? 0) > 0;
            return !hasIssues;
          })
          .map((itemId) => {
            const featureItems = FEATURE_CHECK_ITEMS[feature.id as keyof typeof FEATURE_CHECK_ITEMS];
            const item = featureItems?.find((i) => i.id === itemId);
            return item ? { requirementId: item.requirementId, itemLabel: item.label } : null;
          })
          .filter((item): item is { requirementId: number; itemLabel: string } => item !== null);
      })
    : [];

  // Combine all failed checks without issues
  const allFailedChecksWithoutIssues = [...basicFailedChecksWithoutIssues, ...featureFailedChecksWithoutIssues];

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
          <Link href="/lab/game-testing/history">
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
            The requested test result was not found in history.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/lab/game-testing/history">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const ratingBadge = getRatingBadge(result.ratingScore);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab/game-testing/history"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
          Lab / Game Testing / History
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

      {/* Rating Summary */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Final Rating:</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-4xl font-bold ${ratingBadge.color}`}>
                  {result.ratingScore}
                </span>
                <span className="text-muted-foreground">/ 5</span>
              </div>
              <Badge className={`mt-2 ${ratingBadge.bg} ${ratingBadge.color} border-0`}>
                {ratingBadge.label}
              </Badge>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Score:</span>
              <div className="text-2xl font-semibold">
                {result.ratingRawScore.toFixed(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed Checks Warning */}
      {result.hasFailedBasicChecks && (
        <Alert variant="destructive" className="mb-8">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Issues Found</AlertTitle>
          <AlertDescription>
            Some basic checks have failed. A developer report was required.
          </AlertDescription>
        </Alert>
      )}

      {/* Generated Feedback */}
      <FeedbackSection 
        selectedIssues={allSelectedIssues} 
        failedChecks={allFailedChecksWithoutIssues}
        savedFeedbackText={result.feedbackText}
      />

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Checks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>Basic Checks</CardTitle>
                  <CardDescription>Critical check results</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {BASIC_CHECK_ITEMS.map((check) => {
                  const value = result.basicChecks[check.id];
                  const hasIssues = (result.basicCheckIssues?.[check.id]?.length ?? 0) > 0;
                  return (
                    <div key={check.id}>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          value === true
                            ? "bg-green-50 dark:bg-green-950/20"
                            : value === false
                            ? "bg-red-50 dark:bg-red-950/20"
                            : "bg-gray-50 dark:bg-gray-900"
                        }`}
                      >
                        <span className="text-sm">{check.label}</span>
                        {value === true ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : value === false ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Not checked</span>
                        )}
                      </div>
                      {value === false && hasIssues && result.basicCheckIssues && (
                        <FailedCheckDetails
                          checkId={check.id}
                          issueIndices={result.basicCheckIssues[check.id] || []}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Notes */}
                {result.basicChecksNotes && (
                  <div className="mt-4 pt-4 border-t">
                    <label className="text-sm font-medium mb-2 block text-muted-foreground">Notes</label>
                    <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                      {result.basicChecksNotes}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Feature Checks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Settings className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle>Feature Checks</CardTitle>
                  <CardDescription>Checked features</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.features
                .filter((f) => f.applicable)
                .map((feature) => {
                  const config = FEATURES_CONFIG.find((c) => c.id === feature.id);
                  if (!config) return null;
                  const Icon = config.icon;
                  const passedCount = feature.checkedItems.length;
                  const failedItems = feature.failedItems || {};
                  const failedCount = Object.keys(failedItems).length;
                  const totalCount = passedCount + failedCount;

                  return (
                    <div key={feature.id} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{feature.name}</span>
                        <Badge
                          variant={failedCount > 0 ? "destructive" : "secondary"}
                          className="ml-auto"
                        >
                          {passedCount} / {totalCount}
                        </Badge>
                      </div>

                      {/* Show failed items with issues */}
                      {failedCount > 0 && (
                        <div className="mt-2 space-y-2">
                          {Object.entries(failedItems).map(([itemId, issueIndices]) => {
                            const featureItems =
                              FEATURE_CHECK_ITEMS[feature.id as keyof typeof FEATURE_CHECK_ITEMS];
                            const item = featureItems?.find((i) => i.id === itemId);
                            if (!item) return null;

                            return (
                              <div key={itemId}>
                                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                  <XCircle className="h-4 w-4" />
                                  <span>{item.label}</span>
                                </div>
                                <FailedFeatureCheckDetails
                                  featureId={feature.id}
                                  itemId={itemId}
                                  issueIndices={issueIndices}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              {result.features.filter((f) => f.applicable).length === 0 && (
                <p className="text-muted-foreground text-sm">No applicable features</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Rating Criteria */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <CardTitle>Game Rating</CardTitle>
                  <CardDescription>Applied criteria</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.ratingCriteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      criterion.checked
                        ? "bg-green-50 dark:bg-green-950/20"
                        : "bg-gray-50 dark:bg-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {criterion.checked ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="text-sm">{criterion.label}</span>
                    </div>
                    <Badge
                      variant={criterion.checked ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {criterion.checked ? `+${criterion.weight}` : criterion.weight}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-center">
        <Link href="/lab/game-testing/history">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </Link>
      </div>
    </div>
  );
}
