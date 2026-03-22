"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trophy,
  Settings,
  Star,
  Users,
  ShoppingCart,
  Share2,
  RotateCcw,
  Save,
  Flag,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import {
  saveGameTestResult,
  generateId,
  type GameTestResult,
} from "@/lib/game-testing-storage";

// ==================== TYPES ====================

type CheckItem = {
  id: string;
  label: string;
  description?: string;
};

type FeatureCheck = {
  id: string;
  name: string;
  icon: React.ReactNode;
  applicable: boolean;
  items: CheckItem[];
  checkedItems: string[];
};

type RatingCriterion = {
  id: string;
  label: string;
  weight: number;
  checked: boolean;
};

// ==================== DATA ====================

const BASIC_CHECKS: CheckItem[] = [
  { id: "sdk", label: "SDK интегрирован", description: "Игра корректно инициализирует SDK" },
  { id: "content", label: "Нет спорного контента / IP", description: "Нет нарушений авторских прав и спорного контента" },
  { id: "crashes", label: "Нет крэшей", description: "Игра стабильна, не падает во время gameplay" },
  { id: "ui_scale", label: "Нет кривого UI в разных режимах Scale", description: "UI корректно отображается при изменении размеров браузера" },
  { id: "english", label: "Английский язык по умолчанию", description: "Игра запускается на английском языке" },
  { id: "progress_save", label: "После перезагрузки страницы - прогресс сохраняется", description: "Прогресс игрока не теряется" },
  { id: "sound", label: "Есть звук в игре", description: "Игра имеет звуковое оформление" },
  { id: "rewarded_ads", label: "Вызов rewarded рекламы ожидаем", description: "Кнопки намекают что там реклама" },
  { id: "continue_no_ads", label: "Игру можно продолжать без обязательного реворда", description: "Можно пройти уровень заново без просмотра рекламы" },
  { id: "pause_ads", label: "Игра ставится на паузу при рекламе", description: "Геймлей останавливается во время показа рекламы" },
  { id: "sound_mute_ads", label: "Звук пропадает во время рекламы и при сворачивании вкладки", description: "Корректное поведение звука" },
  { id: "mute_button", label: "Есть кнопка отключения звука в игре", description: "Пользователь может выключить звук" },
  { id: "mobile_support", label: "Если есть поддержка мобайла - игра там запускается и нормально проходится первый уровень", description: "Мобильная версия работает корректно" },
  { id: "auth", label: "Если есть авторизация - она работает", description: "Система авторизации функционирует" },
  { id: "languages", label: "Если есть несколько языков - игра подстраивается под выбранный язык", description: "Локализация работает корректно" },
];

const RATING_CRITERIA: RatingCriterion[] = [
  { id: "readable_ui", label: "Кнопки больше? Тексты читаемые? Выглядят хорошо?", weight: 1.5, checked: false },
  { id: "fresh_ui", label: "UI в игре свежий, стильный, проработанный?", weight: 3, checked: false },
  { id: "unique", label: "Играл/а во что-то похожее? Уникально выглядит?", weight: 2, checked: false },
  { id: "genre_quality", label: "Для своего жанра игра проработана лучше среднего?", weight: 2, checked: false },
  { id: "progression", label: "Есть прогрессия у игрока или в уровнях? Хочется узнать что будет дальше?", weight: 1.5, checked: false },
  { id: "easy_start", label: "Первые уровни легкие? Удается получить быстрый первый результат?", weight: 1.5, checked: false },
  { id: "game_modes", label: "В игре есть разные режимы?", weight: 0.5, checked: false },
  { id: "characters", label: "В игре есть разные персонажи / скины / образы?", weight: 0.5, checked: false },
  { id: "onboarding", label: "Есть интро-уровень с онбордингом?", weight: 1, checked: false },
  { id: "controls_clear", label: "Управление объясняется? Понятно как играть?", weight: 1, checked: false },
  { id: "meta_gameplay", label: "Мета-геймплей есть?", weight: 1, checked: false },
  { id: "meta_important", label: "Если мета-геймплей убрать - станет играть уже не так интересно?", weight: 1, checked: false },
  { id: "desktop_controls", label: "Управление на десктопе удобное?", weight: 2, checked: false },
  { id: "mobile_controls", label: "Если мобилка поддерживается - удобное управление?", weight: 1, checked: false },
  { id: "rewarded_value", label: "Если реворды убрать - играть станет сложнее?", weight: 1, checked: false },
  { id: "rewarded_types", label: "Ревордов >= 2 разных типов?", weight: 1, checked: false },
  { id: "popularity_5k", label: "Лайков на Crazy/Poki >5k или скачиваний Google Play >100k?", weight: 1.5, checked: false },
  { id: "popularity_15k", label: "Лайков на Crazy/Poki >15k или скачиваний Google Play 500k или рейтинг на Яндекс >70?", weight: 3, checked: false },
  { id: "retention_features", label: "Дейлики, колесо фортуны, ачивки, таски - есть что-то из этого?", weight: 1, checked: false },
  { id: "retention_2of5", label: "Дейлики, колесо фортуны, ачивки, таски, прогресс - 2 из 5 этого списка есть в игре?", weight: 0.5, checked: false },
  { id: "size_50mb", label: "Вес билда <50Mb?", weight: 0.5, checked: false },
  { id: "size_25mb", label: "Вес билда <25Mb?", weight: 0.5, checked: false },
  { id: "influencers", label: "Есть инн-апп покупки?", weight: 1, checked: false },
  { id: "big_studio", label: "Игра от крупной студии?", weight: 1.5, checked: false },
  { id: "desktop_adapt", label: "Адаптация под десктоп нормальная, ушей нету?", weight: 1.5, checked: false },
  { id: "all_platforms", label: "Поддерживаются все платформы?", weight: 1.5, checked: false },
  { id: "leaderboard_multiplayer", label: "Лидерборды или мультиплеер. Есть что-то из этого?", weight: 1.5, checked: false },
  { id: "no_annoying", label: "Есть что-то сильно раздражающее или мешающее игре?", weight: 2, checked: false },
  { id: "smart_ads", label: "В игре можно безболезненно вставить Smart Ads?", weight: 1, checked: false },
  { id: "anzu_ads", label: "В игре применима реклама от Anzu?", weight: 1, checked: false },
];

// Additional questions for high-rated games (4-5 stars)
type DetailedQuestion = {
  id: string;
  label: string;
  placeholder: string;
  section?: string;
};

const DETAILED_QUESTIONS: DetailedQuestion[] = [
  {
    id: "about",
    label: "О чем игра? Что нужно делать?",
    placeholder: "Idle игра, где нужно избивать прохожих, отбирать у них деньги и захватывать территории",
  },
  {
    id: "storyline",
    label: "Есть ли в игре сюжетная линия?",
    placeholder: "Как таковой сюжетной линии нет, но задача понятная - надо захватывать территорию, нанимать работников кто будет грабить вместо тебя и открывать карту постепенно",
  },
  {
    id: "hook",
    label: "Какая фишка у игры? Чем она может зацепить игроков?",
    placeholder: "Мало похожих игры про мафию. Есть мини-игры внутри. Хорошая графика, разные задания. Можно кастомизировать персонажа и купать ему мотоциклы чтобы он двигался быстрее",
  },
  {
    id: "bosses",
    label: "Есть ли боссы и чем они отличаются?",
    placeholder: "Да, но боссы достаточно слабые все. Они стоят там, где открываются новые города для хавхата - типа стражей",
  },
  {
    id: "currencies",
    label: "Какие есть валюты и на что их тратить (обычная - золото, премиальная - кристаллы и т.д.)?",
    placeholder: "Деньги тратятся на открытие новых территорий и прокачку персонажа, новая одежда, мотоциклы и тд",
  },
  {
    id: "progression",
    label: "Как именно работает прокачка? Что нужно делать чтобы прокачиваться быстрее?",
    placeholder: "Ездить на мотоцикле и нанимать работников + иногда на просмотр рекламы можно получать в течении какого-то времени двойную награду",
  },
  {
    id: "iap",
    label: "Есть ли внутриигровые покупки? Что можно покупать и на что влияет? Ускоряет ли донат прогресс игры?",
    placeholder: "Только на одежду можно тратить деньги и на открытие новых территорий",
  },
  {
    id: "leaderboards",
    label: "Есть ли лидерборды? Как туда попасть? Какие они есть (недельные, месячные, за все время и т.д.)?",
    placeholder: "Нет",
  },
  {
    id: "content_elements",
    label: "Какие есть цепляющие элементы контента (оружие, машины, локации, скилы, отсылки к известным франшизам и т.д.)?",
    placeholder: "Мини-игры внутри. Разное оружие, понятно что делать, простая механика внутри игры.",
  },
  {
    id: "customization",
    label: "Есть ли в игре кастомизация? Можно ли настроить внешний вид героя, редактор локация, тюнинг авто и т.д.?",
    placeholder: "Да, можно купить одежду, можно купить разные мотоциклы",
  },
  {
    id: "daily_rewards",
    label: "Есть ли ежедневные награды или что-то подобное, что заставляет игрока вернуться?",
    placeholder: "Да, каждый день захода в игру дает какие-то бонусы типа вещей или заработанных денег",
  },
  {
    id: "sound",
    label: "Желательно ли играть со звуком, чтобы лучше погрузиться в атмосферу или без звука будут трудности с прохождением?",
    placeholder: "Музыка хорошая дополняет игры, но необязательна для прохождения игры",
  },
  {
    id: "minigames",
    label: "Есть ли мини игры внутри основного сюжета? Например, головоломки «три в ряд» внутри стратегии",
    placeholder: "Да, есть. Где-то попасть баскетбольным мячом в корзину надо, где-то попасть в такт играющей из машины музыке",
  },
  {
    id: "levels_count",
    label: "Понятно ли какое- кол-во уровней? Сколько их? (прочерк если непонятно)",
    placeholder: "-",
  },
  {
    id: "achievements",
    label: "Есть ли система достижений ачивок? Какие они и за что можно получить?",
    placeholder: "За ежедневный заход в игру, за собранные монтаны, за собранные журналы и тд",
  },
  // Multiplayer section
  {
    id: "mp_chat",
    label: "Есть ли внутри игры онлайн чат? Голосовой чат?",
    placeholder: "",
    section: "Мультиплеер (если есть)",
  },
  {
    id: "mp_realtime",
    label: "Игра происходит в реальном времени или асинхронно?",
    placeholder: "",
    section: "Мультиплеер (если есть)",
  },
  {
    id: "mp_friends",
    label: "Можно ли играть с друзьями?",
    placeholder: "",
    section: "Мультиплеер (если есть)",
  },
  {
    id: "mp_room_size",
    label: "Размер комнат, сколько игроков играет одновременно?",
    placeholder: "",
    section: "Мультиплеер (если есть)",
  },
];

// ==================== COMPONENTS ====================

function CheckItemRow({
  item,
  checked,
  onChange,
  showWeight,
  weight,
}: {
  item: CheckItem | RatingCriterion;
  checked: boolean;
  onChange: (checked: boolean) => void;
  showWeight?: boolean;
  weight?: number;
}) {
  const isRatingCriterion = "weight" in item;
  
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        checked && "bg-accent/5"
      )}
    >
      <div className="pt-0.5">
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-sm font-medium",
            checked && "text-accent"
          )}>
            {item.label}
          </span>
          {showWeight && weight && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{weight}
            </Badge>
          )}
        </div>
        {(item as CheckItem).description && (
          <p className="text-xs text-muted-foreground mt-1">
            {(item as CheckItem).description}
          </p>
        )}
      </div>
    </label>
  );
}

function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// ==================== MAIN PAGE ====================

export default function GameTestingPage() {
  const router = useRouter();
  
  // Game name state
  const [gameName, setGameName] = useState("");
  
  // Basic checks state
  const [basicChecks, setBasicChecks] = useState<Record<string, boolean>>({});
  
  // Feature checks state
  const [features, setFeatures] = useState<FeatureCheck[]>([
    {
      id: "multiplayer",
      name: "Мультиплеер",
      icon: <Users className="h-4 w-4" />,
      applicable: false,
      items: [
        { id: "mp_desktop_mobile", label: "Запускаем игру и в Desktop и в мобилке. Тестируем, что игроки видят друг друга" },
      ],
      checkedItems: [],
    },
    {
      id: "leaderboards",
      name: "Лидерборды",
      icon: <Trophy className="h-4 w-4" />,
      applicable: false,
      items: [
        { id: "lb_play", label: "Играем какое-то время, проигрываем. Открываем лидерборд - мы там есть" },
        { id: "lb_reload", label: "Перезагружаем страницу открываем страницу - мы там все еще есть" },
        { id: "lb_record", label: "Пробуем побить свой рекорд. Открываем лидерборд - данные там изменились" },
      ],
      checkedItems: [],
    },
    {
      id: "iap",
      name: "Ин-апы",
      icon: <ShoppingCart className="h-4 w-4" />,
      applicable: false,
      items: [
        { id: "iap_purchase", label: "Пробуем совершить покупку - все проходит, покупка начисляется" },
        { id: "iap_reload", label: "Перезагружаем страницу - видим что все купленное ранее отображается" },
        { id: "iap_non_consumable", label: "Если покупка была non-consumable - проверяем, что ее нельзя купить снова" },
      ],
      checkedItems: [],
    },
    {
      id: "social",
      name: "Социальный шеринг",
      icon: <Share2 className="h-4 w-4" />,
      applicable: false,
      items: [
        { id: "social_toggle", label: "Кнопка шаринга пропадает, когда в Feature Control флаг Social Share отключен и наоборот" },
      ],
      checkedItems: [],
    },
  ]);
  
  // Rating criteria state
  const [ratingCriteria, setRatingCriteria] = useState<RatingCriterion[]>(RATING_CRITERIA);
  const [showRating, setShowRating] = useState(false);
  
  // Detailed questions state (for games rated 4-5)
  const [detailedAnswers, setDetailedAnswers] = useState<Record<string, string>>({});
  
  // Generated description state
  const [generatedDescription, setGeneratedDescription] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Calculate stats
  const basicStats = useMemo(() => {
    const total = BASIC_CHECKS.length;
    const checked = Object.values(basicChecks).filter(Boolean).length;
    return { total, checked, progress: (checked / total) * 100 };
  }, [basicChecks]);

  const featureStats = useMemo(() => {
    const applicableFeatures = features.filter((f) => f.applicable);
    const totalChecks = applicableFeatures.reduce(
      (sum, f) => sum + f.items.length,
      0
    );
    const checkedChecks = applicableFeatures.reduce(
      (sum, f) => sum + f.checkedItems.length,
      0
    );
    const progress = totalChecks > 0 ? (checkedChecks / totalChecks) * 100 : 0;
    return {
      applicableCount: applicableFeatures.length,
      totalChecks,
      checkedChecks,
      progress,
    };
  }, [features]);

  // Handlers
  const handleBasicCheck = (id: string, checked: boolean) => {
    setBasicChecks((prev) => ({ ...prev, [id]: checked }));
  };

  const handleFeatureApplicable = (featureId: string, applicable: boolean) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId ? { ...f, applicable, checkedItems: [] } : f
      )
    );
  };

  const handleFeatureCheck = (featureId: string, itemId: string, checked: boolean) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? {
              ...f,
              checkedItems: checked
                ? [...f.checkedItems, itemId]
                : f.checkedItems.filter((id) => id !== itemId),
            }
          : f
      )
    );
  };

  const handleRatingCheck = (id: string, checked: boolean) => {
    setRatingCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, checked } : c))
    );
  };

  const handleDetailedAnswer = (id: string, value: string) => {
    setDetailedAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleGenerateDescription = useCallback(async () => {
    setIsGenerating(true);
    try {
      const qaList = DETAILED_QUESTIONS.map((q) => ({
        label: q.label,
        answer: detailedAnswers[q.id] || "",
      }));

      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions: qaList }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details?.error?.message || data.error || "Failed to generate description";
        throw new Error(errorMsg);
      }

      setGeneratedDescription(data.description);
    } catch (error) {
      alert("Ошибка при генерации описания: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [detailedAnswers]);

  const handleReset = () => {
    if (confirm("Сбросить все результаты проверки?")) {
      setGameName("");
      setBasicChecks({});
      setFeatures((prev) =>
        prev.map((f) => ({ ...f, applicable: false, checkedItems: [] }))
      );
      setRatingCriteria(RATING_CRITERIA);
      setShowRating(false);
      setDetailedAnswers({});
      setGeneratedDescription("");
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!gameName.trim()) {
      alert("Введите название игры");
      return;
    }

    const result: GameTestResult = {
      id: generateId(),
      gameName: gameName.trim(),
      date: new Date().toISOString(),
      basicChecks,
      features: features.map((f) => ({
        id: f.id,
        name: f.name,
        applicable: f.applicable,
        checkedItems: f.checkedItems,
      })),
      ratingCriteria,
      ratingScore: calculateRating.score,
      ratingRawScore: calculateRating.rawScore,
      detailedAnswers,
      generatedDescription,
      hasFailedBasicChecks,
    };

    try {
      setIsSaving(true);
      await saveGameTestResult(result);
      setToast({ message: "Results saved successfully!", type: "success" });
      setTimeout(() => {
        router.push("/lab/game-testing/history");
      }, 1000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Failed to save results",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasFailedBasicChecks = useMemo(() => {
    return BASIC_CHECKS.some((check) => basicChecks[check.id] === false);
  }, [basicChecks]);

  // IDs of criteria excluded from final score calculation
  const EXCLUDED_CRITERIA_IDS = ["smart_ads", "anzu_ads"];
  const NEGATIVE_CRITERIA_ID = "no_annoying";

  // Calculate final rating score based on business rules:
  // - Sum all checked criteria * weight
  // - Subtract "no_annoying" if checked (negative criterion)
  // - Exclude smart_ads and anzu_ads from calculation
  // - Apply Excel formula: =IF(D32>26.5,5,IF(D32>22,4,IF(D32>16,3,2)))
  const calculateRating = useMemo(() => {
    let totalScore = 0;
    let maxPossibleScore = 0;

    ratingCriteria.forEach((criterion) => {
      // Skip excluded criteria
      if (EXCLUDED_CRITERIA_IDS.includes(criterion.id)) {
        return;
      }

      // Add to max possible score
      maxPossibleScore += criterion.weight;

      // Calculate actual score
      if (criterion.checked) {
        if (criterion.id === NEGATIVE_CRITERIA_ID) {
          // Negative criterion: subtract its weight if checked
          totalScore -= criterion.weight;
        } else {
          // Positive criterion: add its weight if checked
          totalScore += criterion.weight;
        }
      }
    });

    // Apply Excel formula logic:
    // =IF(D32>26.5,5,IF(D32>22,4,IF(D32>16,3,2)))
    let finalScore: number;
    if (totalScore > 26.5) {
      finalScore = 5;
    } else if (totalScore > 22) {
      finalScore = 4;
    } else if (totalScore > 16) {
      finalScore = 3;
    } else {
      finalScore = 2;
    }

    return {
      score: finalScore,
      rawScore: totalScore,
      maxScore: maxPossibleScore,
    };
  }, [ratingCriteria]);

  const getRatingLabel = (score: number) => {
    if (score >= 4.5) return { label: "5 - Excellent", variant: "success" as const, color: "text-green-600" };
    if (score >= 3.5) return { label: "4 - Good", variant: "accent" as const, color: "text-blue-600" };
    if (score >= 2.5) return { label: "3 - Average", variant: "warning" as const, color: "text-yellow-600" };
    if (score >= 1.5) return { label: "2 - Below Average", variant: "secondary" as const, color: "text-orange-600" };
    return { label: "1 - Poor", variant: "destructive" as const, color: "text-red-600" };
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          ← Back to Lab
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
              Lab
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 sm:h-9 sm:w-9 text-accent" />
              Game Testing
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl">
              Game testing checklist for moderators. Check basic items, functionality, and rate the game.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/lab/game-testing/history")}
            className="hidden sm:flex"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
        {/* Mobile History Button */}
        <Button
          variant="outline"
          onClick={() => router.push("/lab/game-testing/history")}
          className="mt-4 sm:hidden w-full"
        >
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </div>

      {/* Game Name Input - Compact */}
      <div className="max-w-md mb-8">
        <label className="text-sm font-medium mb-2 block">
          Game Name
        </label>
        <Input
          placeholder="Enter the name of the game being tested..."
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
      </div>

      {/* Alerts */}
      {hasFailedBasicChecks && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Developer Report Required</AlertTitle>
          <AlertDescription>
            Some basic checks have failed. A report must be created with details of the issues.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Checklists */}
        <div className="space-y-6">
          {/* Basic Checks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Basic Checks</CardTitle>
                    <CardDescription>
                      Critical checks before publication
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={basicStats.progress === 100 ? "success" : "secondary"}>
                  {Math.round(basicStats.progress)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {BASIC_CHECKS.map((check) => (
                  <CheckItemRow
                    key={check.id}
                    item={check}
                    checked={basicChecks[check.id] || false}
                    onChange={(checked) => handleBasicCheck(check.id, checked)}
                  />
                ))}
              </div>
              
              {/* Failed items indicator */}
              {hasFailedBasicChecks && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Failed checks:
                  </div>
                  <div className="mt-2 space-y-1">
                    {BASIC_CHECKS.filter((c) => basicChecks[c.id] === false).map((check) => (
                      <div key={check.id} className="text-sm text-red-600 dark:text-red-400 pl-6">
                        • {check.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <CardDescription>
                    Mark applicable features and check their functionality
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature) => (
                <Collapsible key={feature.id} defaultOpen={feature.applicable}>
                  <div className="rounded-lg border">
                    <div className="flex items-center gap-3 p-4">
                      <Checkbox
                        checked={feature.applicable}
                        onChange={(e) =>
                          handleFeatureApplicable(feature.id, e.target.checked)
                        }
                      />
                      <div className="flex-1">
                        <CollapsibleTrigger className="flex items-center gap-2 hover:no-underline">
                          <span className="text-purple-500">{feature.icon}</span>
                          <span className="font-medium">{feature.name}</span>
                        </CollapsibleTrigger>
                      </div>
                      {feature.applicable && (
                        <Badge variant="secondary" className="text-xs">
                          {feature.checkedItems.length} / {feature.items.length}
                        </Badge>
                      )}
                    </div>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-1 border-t pt-2">
                        {feature.items.map((item) => (
                          <CheckItemRow
                            key={item.id}
                            item={item}
                            checked={feature.checkedItems.includes(item.id)}
                            onChange={(checked) =>
                              handleFeatureCheck(feature.id, item.id, checked)
                            }
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Rating */}
        <div className="space-y-6">
          <Card className="sticky top-20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <CardTitle>Game Rating</CardTitle>
                  <CardDescription>
                    Rate the game based on criteria
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 max-h-[700px] overflow-y-auto pr-1">
                {ratingCriteria.map((criterion) => (
                  <CheckItemRow
                    key={criterion.id}
                    item={criterion}
                    checked={criterion.checked}
                    onChange={(checked) => handleRatingCheck(criterion.id, checked)}
                    showWeight
                    weight={criterion.weight}
                  />
                ))}
              </div>

              {/* Show Rating Button and Result */}
              <div className="pt-4 border-t">
                {!showRating ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowRating(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Show Rating
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Score: <span className="font-semibold text-foreground">{calculateRating.rawScore.toFixed(1)}</span>
                      </div>
                      <div className={cn("text-5xl font-bold", getRatingLabel(calculateRating.score).color)}>
                        {calculateRating.score}
                      </div>
                      <div className="text-sm text-muted-foreground">out of 5</div>
                      <Badge 
                        variant={getRatingLabel(calculateRating.score).variant} 
                        className="mt-1"
                      >
                        {getRatingLabel(calculateRating.score).label}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full"
                      onClick={() => setShowRating(false)}
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Rating
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Questions for High-Rated Games (4-5 stars) */}
      {showRating && calculateRating.score >= 4 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Detailed Description</CardTitle>
                <CardDescription>
                  Additional questions for highly-rated games (rating 4 or 5)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {DETAILED_QUESTIONS.reduce((acc: React.ReactNode[], question, index) => {
              // Add section header if this question starts a new section
              if (question.section && (index === 0 || DETAILED_QUESTIONS[index - 1].section !== question.section)) {
                acc.push(
                  <div key={`section-${question.id}`} className="pt-4 first:pt-0">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {question.section}
                    </h4>
                  </div>
                );
              }
              
              acc.push(
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium">
                    {question.label}
                  </label>
                  <Textarea
                    value={detailedAnswers[question.id] || ""}
                    onChange={(e) => handleDetailedAnswer(question.id, e.target.value)}
                    placeholder={question.placeholder}
                    className="min-h-[80px] resize-y"
                  />
                </div>
              );
              
              return acc;
            }, [])}
            
            {/* Generate Description Button */}
            <div className="pt-6 border-t space-y-4">
              <Button
                onClick={handleGenerateDescription}
                disabled={isGenerating}
                className="w-full"
                variant="secondary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Description
                  </>
                )}
              </Button>
              
              {generatedDescription && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generated Description:</label>
                  <Textarea
                    value={generatedDescription}
                    readOnly
                    className="min-h-[300px] resize-y bg-muted/50 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigator.clipboard.writeText(generatedDescription)}
                  >
                    Copy to Clipboard
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        
        <div className="flex items-center gap-3">
          {hasFailedBasicChecks && (
            <Button variant="destructive">
              <Flag className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Results
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
