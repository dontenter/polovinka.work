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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  getGameTestResultById,
  type GameTestResult,
} from "@/lib/game-testing-storage";

// Import the data constants from main page
const BASIC_CHECKS = [
  { id: "sdk", label: "SDK интегрирован" },
  { id: "content", label: "Нет спорного контента / IP" },
  { id: "crashes", label: "Нет крэшей" },
  { id: "ui_scale", label: "Нет кривого UI в разных режимах Scale" },
  { id: "english", label: "Английский язык по умолчанию" },
  { id: "progress_save", label: "После перезагрузки страницы - прогресс сохраняется" },
  { id: "sound", label: "Есть звук в игре" },
  { id: "rewarded_ads", label: "Вызов rewarded рекламы ожидаем" },
  { id: "continue_no_ads", label: "Игру можно продолжать без обязательного реворда" },
  { id: "pause_ads", label: "Игра ставится на паузу при рекламе" },
  { id: "sound_mute_ads", label: "Звук пропадает во время рекламы и при сворачивании вкладки" },
  { id: "mute_button", label: "Есть кнопка отключения звука в игре" },
  { id: "mobile_support", label: "Если есть поддержка мобайла - игра там запускается и нормально проходится первый уровень" },
  { id: "auth", label: "Если есть авторизация - она работает" },
  { id: "languages", label: "Если есть несколько языков - игра подстраивается под выбранный язык" },
];

const FEATURES_CONFIG = [
  { id: "multiplayer", name: "Мультиплеер", icon: Users },
  { id: "leaderboards", name: "Лидерборды", icon: Trophy },
  { id: "iap", name: "Ин-апы", icon: ShoppingCart },
  { id: "social", name: "Социальный шеринг", icon: Share2 },
];

const DETAILED_QUESTIONS = [
  { id: "about", label: "О чем игра? Что нужно делать?" },
  { id: "storyline", label: "Есть ли в игре сюжетная линия?" },
  { id: "hook", label: "Какая фишка у игры? Чем она может зацепить игроков?" },
  { id: "bosses", label: "Есть ли боссы и чем они отличаются?" },
  { id: "currencies", label: "Какие есть валюты и на что их тратить (обычная - золото, премиальная - кристаллы и т.д.)?" },
  { id: "progression", label: "Как именно работает прокачка? Что нужно делать чтобы прокачиваться быстрее?" },
  { id: "iap", label: "Есть ли внутриигровые покупки? Что можно покупать и на что влияет? Ускоряет ли донат прогресс игры?" },
  { id: "leaderboards_q", label: "Есть ли лидерборды? Как туда попасть? Какие они есть (недельные, месячные, за все время и т.д.)?" },
  { id: "content_elements", label: "Какие есть цепляющие элементы контента (оружие, машины, локации, скилы, отсылки к известным франшизам и т.д.)?" },
  { id: "customization", label: "Есть ли в игре кастомизация? Можно ли настроить внешний вид героя, редактор локация, тюнинг авто и т.д.?" },
  { id: "daily_rewards", label: "Есть ли ежедневные награды или что-то подобное, что заставляет игрока вернуться?" },
  { id: "sound_q", label: "Желательно ли играть со звуком, чтобы лучше погрузиться в атмосферу или без звука будут трудности с прохождением?" },
  { id: "minigames", label: "Есть ли мини игры внутри основного сюжета? Например, головоломки «три в ряд» внутри стратегии" },
  { id: "levels_count", label: "Понятно ли какое- кол-во уровней? Сколько их? (прочерк если непонятно)" },
  { id: "achievements", label: "Есть ли система достижений ачивок? Какие они и за что можно получить?" },
  { id: "mp_chat", label: "Есть ли внутри игры онлайн чат? Голосовой чат?", section: "Мультиплеер" },
  { id: "mp_realtime", label: "Игра происходит в реальном времени или асинхронно?", section: "Мультиплеер" },
  { id: "mp_friends", label: "Можно ли играть с друзьями?", section: "Мультиплеер" },
  { id: "mp_room_size", label: "Размер комнат, сколько игроков играет одновременно?", section: "Мультиплеер" },
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

export default function GameTestResultPage() {
  const params = useParams();
  const [result, setResult] = useState<GameTestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      const data = getGameTestResultById(id);
      setResult(data);
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
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
                {BASIC_CHECKS.map((check) => {
                  const value = result.basicChecks[check.id];
                  return (
                    <div
                      key={check.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        value === true
                          ? "bg-green-50"
                          : value === false
                          ? "bg-red-50"
                          : "bg-gray-50"
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
                  );
                })}
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
                  const totalChecks = feature.checkedItems.length;
                  return (
                    <div key={feature.id} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{feature.name}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {totalChecks} checked
                        </Badge>
                      </div>
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
                      criterion.checked ? "bg-green-50" : "bg-gray-50"
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

      {/* Detailed Questions */}
      {Object.keys(result.detailedAnswers).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Detailed Description</CardTitle>
                <CardDescription>Answers to additional questions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {DETAILED_QUESTIONS.filter((q) => result.detailedAnswers[q.id]?.trim()).map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="text-sm font-medium">{question.label}</label>
                <Textarea
                  value={result.detailedAnswers[question.id]}
                  readOnly
                  className="min-h-[80px] resize-none bg-muted/50"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated Description */}
      {result.generatedDescription && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generated Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={result.generatedDescription}
              readOnly
              className="min-h-[300px] resize-none bg-muted/50 font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

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
