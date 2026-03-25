"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2,
  ArrowLeft,
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
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  History,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Copy,
  Check,
  Languages,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import {
  REQUIREMENTS,
  BASIC_CHECK_ITEMS,
  FEATURE_CHECK_ITEMS,
  generateFeedback,
  type SelectedIssue,
  type SubRequirement,
  getRequirementByCheckId,
} from "@/lib/requirements";

// ==================== TYPES ====================

type CheckItem = {
  id: string;
  label: string;
  description?: string;
};

type RatingCriterion = {
  id: string;
  label: string;
  weight: number;
  checked: boolean;
};

// Type for check status: true = yes, false = no, undefined = not answered
type CheckStatus = boolean | undefined;

// Extended check state with selected issues
type CheckState = {
  status: CheckStatus;
  selectedIssues: number[]; // indices of selected sub-requirements
};

const DEFAULT_CHECK_STATE: CheckState = { status: undefined, selectedIssues: [] };

// Feature check with items
type FeatureCheck = {
  id: string;
  name: string;
  icon: React.ReactNode;
  applicable: boolean;
  items: CheckItem[];
  itemStates: Record<string, CheckState>; // key: itemId
};

// ==================== DATA ====================

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

function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// Component for issues selection when requirement fails
function IssuesSelector({
  requirementId,
  subRequirements,
  selectedIssues,
  onIssueToggle,
}: {
  requirementId: number;
  subRequirements: SubRequirement[];
  selectedIssues: number[];
  onIssueToggle: (requirementId: number, issueIndex: number) => void;
}) {
  return (
    <div className="ml-4 mt-2 pl-4 border-l-2 border-red-200 dark:border-red-800 space-y-2">
      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
        Select specific issues found:
      </p>
      {subRequirements.map((subReq, index) => (
        <label
          key={index}
          className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <Checkbox
            checked={selectedIssues.includes(index)}
            onChange={(e) => onIssueToggle(requirementId, index)}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground">{subReq.issue}</span>
        </label>
      ))}
    </div>
  );
}

// Component for Yes/No buttons in checks with issues
function CheckItemRowWithIssues({
  item,
  state,
  requirementId,
  onStatusChange,
  onIssueToggle,
}: {
  item: CheckItem;
  state: CheckState;
  requirementId: number;
  onStatusChange: (status: CheckStatus) => void;
  onIssueToggle: (requirementId: number, issueIndex: number) => void;
}) {
  const requirement = REQUIREMENTS.find((r) => r.id === requirementId);
  const hasIssues = requirement && requirement.sub_requirements.length > 0;
  const isFailed = state.status === false;

  return (
    <div className="rounded-lg border border-transparent hover:border-muted transition-colors">
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-8 px-3",
              state.status === true
                ? "bg-emerald-100 text-emerald-700 border-transparent hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-transparent dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                : "border-input hover:bg-muted"
            )}
            onClick={() => {
              console.log('Yes clicked');
              onStatusChange(true);
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={state.status === false ? "destructive" : "outline"}
            className={cn(
              "h-8 px-3",
              state.status === false
                ? "bg-red-100 text-red-700 border-transparent hover:bg-red-100 hover:text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-transparent dark:hover:bg-red-950/40 dark:hover:text-red-400"
                : "border-input hover:bg-muted hover:text-red-600"
            )}
            onClick={() => {
              console.log('No clicked');
              onStatusChange(false);
            }}
          >
            <XCircle className="h-4 w-4 mr-1" />
            No
          </Button>
        </div>
      </div>

      {/* Show issues selector when failed and has sub-requirements */}
      {isFailed && hasIssues && (
        <IssuesSelector
          requirementId={requirementId}
          subRequirements={requirement!.sub_requirements}
          selectedIssues={state.selectedIssues}
          onIssueToggle={onIssueToggle}
        />
      )}

      {/* Show warning when failed but no sub-requirements */}
      {isFailed && !hasIssues && (
        <div className="ml-4 mb-3 pl-4 border-l-2 border-red-200 dark:border-red-800">
          <p className="text-xs text-muted-foreground italic">
            No specific issues defined for this check. Please add notes manually.
          </p>
        </div>
      )}
    </div>
  );
}

// Feature check item component with Yes/No
function FeatureCheckItem({
  item,
  requirementId,
  state,
  onStatusChange,
  onIssueToggle,
}: {
  item: CheckItem;
  requirementId: number;
  state: CheckState;
  onStatusChange: (status: CheckStatus) => void;
  onIssueToggle: (requirementId: number, issueIndex: number) => void;
}) {
  return (
    <CheckItemRowWithIssues
      item={item}
      state={state}
      requirementId={requirementId}
      onStatusChange={onStatusChange}
      onIssueToggle={onIssueToggle}
    />
  );
}

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
        <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-medium", checked && "text-accent")}>
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

// Feedback Modal Component
function FeedbackModal({
  isOpen,
  onClose,
  selectedIssues,
  failedChecks,
  onFeedbackTextChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedIssues: SelectedIssue[];
  failedChecks: { requirementId: number; itemLabel?: string }[];
  onFeedbackTextChange?: (text: string) => void;
}) {
  const [language, setLanguage] = useState<"en" | "ru">("en");
  const [copied, setCopied] = useState(false);
  const [additionalBugs, setAdditionalBugs] = useState("");
  const [optionalSuggestions, setOptionalSuggestions] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Main feedback text (base + AI additions + manual edits)
  const [feedbackText, setFeedbackTextState] = useState("");

  // Wrapper to update both local state and parent
  const setFeedbackText = (text: string | ((prev: string) => string)) => {
    const newText = typeof text === "function" ? text(feedbackText) : text;
    setFeedbackTextState(newText);
    onFeedbackTextChange?.(newText);
  };

  // Generate initial feedback when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialFeedback = generateFeedback(selectedIssues, failedChecks, language);
      setFeedbackTextState(initialFeedback);
      onFeedbackTextChange?.(initialFeedback);
      setAdditionalBugs("");
      setOptionalSuggestions("");
    }
  }, [isOpen, selectedIssues, failedChecks]);

  // Handle language switch - translate the entire feedback text
  const handleLanguageSwitch = async () => {
    const newLanguage = language === "en" ? "ru" : "en";
    
    // If there's no text to translate, just switch language
    if (!feedbackText.trim()) {
      setLanguage(newLanguage);
      const newFeedback = generateFeedback(selectedIssues, failedChecks, newLanguage);
      setFeedbackText(newFeedback);
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
          text: feedbackText,
          targetLanguage: newLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If API key not configured, fallback to regenerating base feedback
        if (data.error?.includes("API key not configured")) {
          const newFeedback = generateFeedback(selectedIssues, failedChecks, newLanguage);
          setFeedbackText(newFeedback);
          setLanguage(newLanguage);
          return;
        }
        throw new Error(data.error || "Failed to translate");
      }

      setFeedbackText(data.translatedText);
      setLanguage(newLanguage);
    } catch (error) {
      // Fallback: regenerate base feedback on error
      const newFeedback = generateFeedback(selectedIssues, failedChecks, newLanguage);
      setFeedbackText(newFeedback);
      setLanguage(newLanguage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnhance = async () => {
    const hasBugs = additionalBugs.trim().length > 0;
    const hasSuggestions = optionalSuggestions.trim().length > 0;
    
    if (!hasBugs && !hasSuggestions) return;
    
    setIsEnhancing(true);
    try {
      let newAdditions = "";

      // Process additional bugs
      if (hasBugs) {
        try {
          const bugsResponse = await fetch("/api/enhance-feedback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              notes: additionalBugs,
              language,
              existingFeedback: feedbackText,
              type: "bugs",
            }),
          });

          const bugsData = await bugsResponse.json();

          if (!bugsResponse.ok) {
            // If API key not configured, fallback to plain text
            if (bugsData.error?.includes("API key not configured")) {
              newAdditions = `[Additional Bugs]\n• ${additionalBugs.trim()}`;
            } else {
              throw new Error(bugsData.error || "Failed to enhance bugs");
            }
          } else {
            newAdditions = bugsData.enhancedFeedback;
          }
        } catch (apiError) {
          // Fallback: add plain text if API fails
          newAdditions = `[Additional Bugs]\n• ${additionalBugs.trim()}`;
        }
      }

      // Process optional suggestions
      if (hasSuggestions) {
        try {
          const suggestionsResponse = await fetch("/api/enhance-feedback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              notes: optionalSuggestions,
              language,
              existingFeedback: feedbackText,
              type: "suggestions",
            }),
          });

          const suggestionsData = await suggestionsResponse.json();

          if (!suggestionsResponse.ok) {
            // If API key not configured, fallback to plain text
            if (suggestionsData.error?.includes("API key not configured")) {
              const separator = newAdditions && !newAdditions.endsWith("\n\n") ? "\n\n" : "";
              newAdditions = newAdditions 
                ? `${newAdditions}${separator}[Optional]\n• ${optionalSuggestions.trim()}`
                : `[Optional]\n• ${optionalSuggestions.trim()}`;
            } else {
              throw new Error(suggestionsData.error || "Failed to enhance suggestions");
            }
          } else {
            const separator = newAdditions && !newAdditions.endsWith("\n\n") ? "\n\n" : "";
            const optionalHeader = language === "en" ? "[Optional]" : "[Опционально]";
            newAdditions = newAdditions 
              ? `${newAdditions}${separator}${optionalHeader}\n${suggestionsData.enhancedFeedback}`
              : `${optionalHeader}\n${suggestionsData.enhancedFeedback}`;
          }
        } catch (apiError) {
          // Fallback: add plain text if API fails
          const separator = newAdditions && !newAdditions.endsWith("\n\n") ? "\n\n" : "";
          newAdditions = newAdditions 
            ? `${newAdditions}${separator}[Optional]\n• ${optionalSuggestions.trim()}`
            : `[Optional]\n• ${optionalSuggestions.trim()}`;
        }
      }
      
      // Append to existing feedback
      const separator = feedbackText && !feedbackText.endsWith("\n\n") ? "\n\n" : "";
      setFeedbackText(feedbackText ? `${feedbackText}${separator}${newAdditions}` : newAdditions);
      
      setAdditionalBugs(""); // Clear the bugs field
      setOptionalSuggestions(""); // Clear the suggestions field
    } catch (error) {
      alert("Error processing notes: " + (error as Error).message);
    } finally {
      setIsEnhancing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold">Generated Feedback</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-auto space-y-4">
          {/* Main feedback textarea */}
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            disabled={isTranslating}
            className="min-h-[180px] resize-y font-mono text-sm bg-muted/30"
            placeholder="Generated feedback will appear here..."
          />

          {/* Additional notes section */}
          <div className="border-t pt-4 space-y-4">
            {/* Two columns layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Additional Bugs Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Additional Bugs</label>
                  <span className="text-xs text-muted-foreground">Critical issues</span>
                </div>
                <Textarea
                  value={additionalBugs}
                  onChange={(e) => setAdditionalBugs(e.target.value)}
                  placeholder="e.g., Game crashes when..."
                  className="min-h-[100px] resize-y text-sm"
                />
              </div>

              {/* Optional Suggestions Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Optional Suggestions</label>
                  <span className="text-xs text-muted-foreground">Improvements & advice</span>
                </div>
                <Textarea
                  value={optionalSuggestions}
                  onChange={(e) => setOptionalSuggestions(e.target.value)}
                  placeholder="e.g., UI could be more..."
                  className="min-h-[100px] resize-y text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleEnhance}
              disabled={isEnhancing || isTranslating || (!additionalBugs.trim() && !optionalSuggestions.trim())}
              className="w-full gap-2"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Add to Feedback
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedIssues.length} issue(s) selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleCopy} className="gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}

// Game Name Input Modal Component
function GameNameModal({
  isOpen,
  onClose,
  onSave,
  initialName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, isOpen]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Enter Game Name</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Please enter the name of the game to continue.
          </p>
          <Input
            placeholder="Game name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function GameTestingPage() {
  const router = useRouter();

  // Game name state
  const [gameName, setGameName] = useState("");

  // Current result ID (for updating existing record)
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);

  // Basic checks state with issues
  const [basicChecks, setBasicChecks] = useState<Record<string, CheckState>>({});

  // Basic checks notes
  const [basicChecksNotes, setBasicChecksNotes] = useState("");

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // Game name input modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"rating" | "feedback" | "save" | null>(null);

  // Feature checks state with Yes/No support
  const [features, setFeatures] = useState<FeatureCheck[]>([
    {
      id: "multiplayer",
      name: "Мультиплеер",
      icon: <Users className="h-4 w-4" />,
      applicable: false,
      items: FEATURE_CHECK_ITEMS.multiplayer.map((item) => ({
        id: item.id,
        label: item.label,
      })),
      itemStates: {},
    },
    {
      id: "leaderboards",
      name: "Лидерборды",
      icon: <Trophy className="h-4 w-4" />,
      applicable: false,
      items: FEATURE_CHECK_ITEMS.leaderboards.map((item) => ({
        id: item.id,
        label: item.label,
      })),
      itemStates: {},
    },
    {
      id: "iap",
      name: "Ин-апы",
      icon: <ShoppingCart className="h-4 w-4" />,
      applicable: false,
      items: FEATURE_CHECK_ITEMS.iap.map((item) => ({
        id: item.id,
        label: item.label,
      })),
      itemStates: {},
    },
    {
      id: "social",
      name: "Социальный шеринг",
      icon: <Share2 className="h-4 w-4" />,
      applicable: false,
      items: FEATURE_CHECK_ITEMS.social.map((item) => ({
        id: item.id,
        label: item.label,
      })),
      itemStates: {},
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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Calculate basic stats
  const basicStats = useMemo(() => {
    const total = BASIC_CHECK_ITEMS.length;
    const answered = Object.values(basicChecks).filter(
      (v) => v.status !== undefined
    ).length;
    const passed = Object.values(basicChecks).filter((v) => v.status === true).length;
    const failed = Object.values(basicChecks).filter((v) => v.status === false).length;
    const issuesCount = Object.values(basicChecks).reduce(
      (sum, v) => sum + v.selectedIssues.length,
      0
    );
    return {
      total,
      answered,
      passed,
      failed,
      issuesCount,
      progress: (answered / total) * 100,
    };
  }, [basicChecks]);

  // Calculate feature stats
  const featureStats = useMemo(() => {
    const applicableFeatures = features.filter((f) => f.applicable);
    let totalChecks = 0;
    let answeredChecks = 0;
    let failedChecks = 0;
    let issuesCount = 0;

    applicableFeatures.forEach((f) => {
      Object.values(f.itemStates).forEach((state) => {
        totalChecks++;
        if (state.status !== undefined) {
          answeredChecks++;
          if (state.status === false) {
            failedChecks++;
            issuesCount += state.selectedIssues.length;
          }
        }
      });
    });

    const progress = totalChecks > 0 ? (answeredChecks / totalChecks) * 100 : 0;
    return {
      applicableCount: applicableFeatures.length,
      totalChecks,
      answeredChecks,
      failedChecks,
      issuesCount,
      progress,
    };
  }, [features]);

  // Handlers
  const handleBasicCheckStatus = (id: string, status: CheckStatus) => {
    setBasicChecks((prev) => ({
      ...prev,
      [id]: {
        status,
        selectedIssues: status === true ? [] : prev[id]?.selectedIssues || [],
      },
    }));
  };

  const handleBasicIssueToggle = (requirementId: number, issueIndex: number) => {
    const checkId = BASIC_CHECK_ITEMS.find(
      (item) => item.requirementId === requirementId
    )?.id;
    if (!checkId) return;

    setBasicChecks((prev) => {
      const current = prev[checkId] || { status: false, selectedIssues: [] };
      const selectedIssues = current.selectedIssues.includes(issueIndex)
        ? current.selectedIssues.filter((i) => i !== issueIndex)
        : [...current.selectedIssues, issueIndex];
      return {
        ...prev,
        [checkId]: { ...current, selectedIssues },
      };
    });
  };

  const handleFeatureApplicable = (featureId: string, applicable: boolean) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? { ...f, applicable, itemStates: applicable ? f.itemStates : {} }
          : f
      )
    );
  };

  const handleFeatureItemStatus = (featureId: string, itemId: string, status: CheckStatus) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? {
              ...f,
              itemStates: {
                ...f.itemStates,
                [itemId]: {
                  status,
                  selectedIssues:
                    status === true ? [] : f.itemStates[itemId]?.selectedIssues || [],
                },
              },
            }
          : f
      )
    );
  };

  const handleFeatureIssueToggle = (featureId: string, itemId: string, issueIndex: number) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;
        const currentState = f.itemStates[itemId] || { status: false, selectedIssues: [] };
        const selectedIssues = currentState.selectedIssues.includes(issueIndex)
          ? currentState.selectedIssues.filter((i) => i !== issueIndex)
          : [...currentState.selectedIssues, issueIndex];
        return {
          ...f,
          itemStates: {
            ...f.itemStates,
            [itemId]: { ...currentState, selectedIssues },
          },
        };
      })
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
        const errorMsg =
          data.details?.error?.message || data.error || "Failed to generate description";
        throw new Error(errorMsg);
      }

      setGeneratedDescription(data.description);
    } catch (error) {
      alert("Ошибка при генерации описания: " + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [detailedAnswers]);

  // Reset all state for a new game (no confirmation)
  const resetState = () => {
    setGameName("");
    setCurrentResultId(null);
    setBasicChecks({});
    setFeatures([
      {
        id: "multiplayer",
        name: "Мультиплеер",
        icon: <Users className="h-4 w-4" />,
        applicable: false,
        items: FEATURE_CHECK_ITEMS.multiplayer.map((item) => ({
          id: item.id,
          label: item.label,
        })),
        itemStates: {},
      },
      {
        id: "leaderboards",
        name: "Лидерборды",
        icon: <Trophy className="h-4 w-4" />,
        applicable: false,
        items: FEATURE_CHECK_ITEMS.leaderboards.map((item) => ({
          id: item.id,
          label: item.label,
        })),
        itemStates: {},
      },
      {
        id: "iap",
        name: "Ин-апы",
        icon: <ShoppingCart className="h-4 w-4" />,
        applicable: false,
        items: FEATURE_CHECK_ITEMS.iap.map((item) => ({
          id: item.id,
          label: item.label,
        })),
        itemStates: {},
      },
      {
        id: "social",
        name: "Социальный шеринг",
        icon: <Share2 className="h-4 w-4" />,
        applicable: false,
        items: FEATURE_CHECK_ITEMS.social.map((item) => ({
          id: item.id,
          label: item.label,
        })),
        itemStates: {},
      },
    ]);
    setRatingCriteria(RATING_CRITERIA);
    setShowRating(false);
    setDetailedAnswers({});
    setGeneratedDescription("");
  };

  const handleReset = () => {
    if (confirm("Сбросить все результаты проверки?")) {
      resetState();
    }
  };

  const handleNewGame = () => {
    resetState();
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (nameOverride?: string) => {
    const nameToUse = nameOverride || gameName;
    if (!nameToUse.trim()) {
      setPendingAction("save");
      setShowNameModal(true);
      return;
    }

    // Use existing ID or generate new one
    const resultId = currentResultId || generateId();
    
    const result: GameTestResult = {
      id: resultId,
      gameName: nameToUse.trim(),
      date: new Date().toISOString(),
      basicChecks: Object.entries(basicChecks).reduce(
        (acc, [key, value]) => {
          acc[key] = value.status;
          return acc;
        },
        {} as Record<string, boolean | undefined>
      ),
      basicCheckIssues: Object.entries(basicChecks).reduce(
        (acc, [key, value]) => {
          if (value.selectedIssues.length > 0) {
            acc[key] = value.selectedIssues;
          }
          return acc;
        },
        {} as Record<string, number[]>
      ),
      features: features.map((f) => ({
        id: f.id,
        name: f.name,
        applicable: f.applicable,
        checkedItems: Object.entries(f.itemStates)
          .filter(([_, state]) => state.status === true)
          .map(([itemId]) => itemId),
        // Include failed items with their issues
        failedItems: Object.entries(f.itemStates).reduce(
          (acc, [itemId, state]) => {
            if (state.status === false) {
              acc[itemId] = state.selectedIssues;
            }
            return acc;
          },
          {} as Record<string, number[]>
        ),
      })),
      ratingCriteria,
      ratingScore: calculateRating.score,
      ratingRawScore: calculateRating.rawScore,
      detailedAnswers,
      generatedDescription,
      hasFailedBasicChecks,
      feedbackText,
      basicChecksNotes,
    };

    try {
      setIsSaving(true);
      console.log("Saving result:", { resultId, result });
      await saveGameTestResult(result);
      setCurrentResultId(resultId);
      console.log("Saved successfully with ID:", resultId);
      setToast({ message: "Results saved successfully!", type: "success" });
    } catch (error) {
      console.error("Save error:", error);
      setToast({
        message: error instanceof Error ? error.message : "Failed to save results",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasFailedBasicChecks = useMemo(() => {
    return Object.values(basicChecks).some((check) => check.status === false);
  }, [basicChecks]);

  const hasFailedFeatureChecks = useMemo(() => {
    return features.some((f) =>
      f.applicable && Object.values(f.itemStates).some((state) => state.status === false)
    );
  }, [features]);

  const allBasicChecksAnswered = useMemo(() => {
    return BASIC_CHECK_ITEMS.every((item) => basicChecks[item.id]?.status !== undefined);
  }, [basicChecks]);

  // Get all selected issues for feedback generation (from basic checks and feature checks)
  const allSelectedIssues = useMemo((): SelectedIssue[] => {
    const issues: SelectedIssue[] = [];

    // Add issues from basic checks
    Object.entries(basicChecks).forEach(([checkId, checkState]) => {
      if (checkState.status === false && checkState.selectedIssues.length > 0) {
        const item = BASIC_CHECK_ITEMS.find((i) => i.id === checkId);
        if (item) {
          checkState.selectedIssues.forEach((issueIndex) => {
            issues.push({
              requirementId: item.requirementId,
              issueIndex,
            });
          });
        }
      }
    });

    // Add issues from feature checks
    features.forEach((feature) => {
      if (!feature.applicable) return;
      Object.entries(feature.itemStates).forEach(([itemId, state]) => {
        if (state.status === false && state.selectedIssues.length > 0) {
          // Find the requirement ID for this feature item
          const featureItems = FEATURE_CHECK_ITEMS[feature.id as keyof typeof FEATURE_CHECK_ITEMS];
          const item = featureItems?.find((i) => i.id === itemId);
          if (item) {
            state.selectedIssues.forEach((issueIndex) => {
              issues.push({
                requirementId: item.requirementId,
                issueIndex,
              });
            });
          }
        }
      });
    });

    return issues;
  }, [basicChecks, features]);

  // Get failed checks without specific issues selected
  const failedChecksWithoutIssues = useMemo(() => {
    const failed: { requirementId: number; itemLabel?: string }[] = [];

    // Add failed basic checks without issues
    Object.entries(basicChecks).forEach(([checkId, checkState]) => {
      if (checkState.status === false && checkState.selectedIssues.length === 0) {
        const item = BASIC_CHECK_ITEMS.find((i) => i.id === checkId);
        if (item) {
          failed.push({
            requirementId: item.requirementId,
          });
        }
      }
    });

    // Add failed feature checks without issues
    features.forEach((feature) => {
      if (!feature.applicable) return;
      Object.entries(feature.itemStates).forEach(([itemId, state]) => {
        if (state.status === false && state.selectedIssues.length === 0) {
          const featureItems = FEATURE_CHECK_ITEMS[feature.id as keyof typeof FEATURE_CHECK_ITEMS];
          const item = featureItems?.find((i) => i.id === itemId);
          if (item) {
            failed.push({
              requirementId: item.requirementId,
              itemLabel: item.label,
            });
          }
        }
      });
    });

    return failed;
  }, [basicChecks, features]);

  // IDs of criteria excluded from final score calculation
  const EXCLUDED_CRITERIA_IDS = ["smart_ads", "anzu_ads"];
  const NEGATIVE_CRITERIA_ID = "no_annoying";

  // Calculate final rating score
  const calculateRating = useMemo(() => {
    let totalScore = 0;
    let maxPossibleScore = 0;

    ratingCriteria.forEach((criterion) => {
      if (EXCLUDED_CRITERIA_IDS.includes(criterion.id)) {
        return;
      }

      maxPossibleScore += criterion.weight;

      if (criterion.checked) {
        if (criterion.id === NEGATIVE_CRITERIA_ID) {
          totalScore -= criterion.weight;
        } else {
          totalScore += criterion.weight;
        }
      }
    });

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
    if (score >= 4.5)
      return {
        label: "5 - Excellent",
        variant: "success" as const,
        color: "text-green-600",
      };
    if (score >= 3.5)
      return { label: "4 - Good", variant: "accent" as const, color: "text-blue-600" };
    if (score >= 2.5)
      return {
        label: "3 - Average",
        variant: "warning" as const,
        color: "text-yellow-600",
      };
    if (score >= 1.5)
      return {
        label: "2 - Below Average",
        variant: "secondary" as const,
        color: "text-orange-600",
      };
    return { label: "1 - Poor", variant: "destructive" as const, color: "text-red-600" };
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lab"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lab
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
              Game testing checklist for moderators. Check basic items, functionality, and
              rate the game.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={handleNewGame}
              className="hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Game
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/lab/game-testing/history")}
              className="hidden sm:flex"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>
        {/* Mobile Buttons */}
        <div className="mt-4 sm:hidden flex flex-col gap-2">
          <Button
            variant="default"
            onClick={handleNewGame}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Game
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/lab/game-testing/history")}
            className="w-full"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Game Name Input - Compact */}
      <div className="max-w-md mb-8">
        <label className="text-sm font-medium mb-2 block">Game Name</label>
        <Input
          placeholder="Enter the name of the game being tested..."
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
      </div>

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
                    <CardDescription>Critical checks before publication</CardDescription>
                  </div>
                </div>
                <Badge
                  variant={basicStats.progress === 100 ? "success" : "secondary"}
                >
                  {basicStats.answered} / {basicStats.total}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {BASIC_CHECK_ITEMS.map((check) => (
                  <CheckItemRowWithIssues
                    key={check.id}
                    item={check}
                    state={basicChecks[check.id] || DEFAULT_CHECK_STATE}
                    requirementId={check.requirementId}
                    onStatusChange={(status) => {
                      console.log('Status change:', check.id, status);
                      handleBasicCheckStatus(check.id, status);
                    }}
                    onIssueToggle={handleBasicIssueToggle}
                  />
                ))}
              </div>

              {/* Failed items indicator */}
              {hasFailedBasicChecks && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Failed checks: {basicStats.failed}
                    {basicStats.issuesCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        ({basicStats.issuesCount} issue(s) selected)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes textarea */}
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea
                  value={basicChecksNotes}
                  onChange={(e) => setBasicChecksNotes(e.target.value)}
                  placeholder="Add your notes here..."
                  className="min-h-[100px] resize-y text-sm"
                />
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
                  <CardDescription>
                    Mark applicable features and check their functionality
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature) => (
                <Collapsible key={feature.id} open={feature.applicable}>
                  <div className="rounded-lg border">
                    <div className="flex items-center gap-3 p-4">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <Checkbox
                          checked={feature.applicable}
                          onChange={(e) =>
                            handleFeatureApplicable(feature.id, e.target.checked)
                          }
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-purple-500">{feature.icon}</span>
                          <span className="text-sm font-medium">{feature.name}</span>
                        </div>
                      </label>
                      {feature.applicable && (
                        <Badge variant="secondary" className="text-xs">
                          {Object.values(feature.itemStates).filter((s) => s.status === true).length} /{" "}
                          {feature.items.length}
                        </Badge>
                      )}
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-1 border-t pt-2">
                        {feature.items.map((item) => {
                          const itemConfig = FEATURE_CHECK_ITEMS[
                            feature.id as keyof typeof FEATURE_CHECK_ITEMS
                          ]?.find((i) => i.id === item.id);
                          const requirementId = itemConfig?.requirementId || 0;

                          return (
                            <FeatureCheckItem
                              key={item.id}
                              item={item}
                              requirementId={requirementId}
                              state={feature.itemStates[item.id] || DEFAULT_CHECK_STATE}
                              onStatusChange={(status) =>
                                handleFeatureItemStatus(feature.id, item.id, status)
                              }
                              onIssueToggle={(reqId, issueIndex) =>
                                handleFeatureIssueToggle(feature.id, item.id, issueIndex)
                              }
                            />
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}

              {/* Failed feature checks indicator */}
              {hasFailedFeatureChecks && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Failed feature checks: {featureStats.failedChecks}
                    {featureStats.issuesCount > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        ({featureStats.issuesCount} issue(s) selected)
                      </span>
                    )}
                  </div>
                </div>
              )}
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
                  <CardDescription>Rate the game based on criteria</CardDescription>
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
                  />
                ))}
              </div>

              {/* Show Rating Button and Result */}
              <div className="pt-4 border-t">
                {!showRating ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (!gameName.trim()) {
                        setPendingAction("rating");
                        setShowNameModal(true);
                        return;
                      }
                      // Save before showing rating
                      await handleSave();
                      setShowRating(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Show Rating
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Score:{" "}
                        <span className="font-semibold text-foreground">
                          {calculateRating.rawScore.toFixed(1)}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "text-5xl font-bold",
                          getRatingLabel(calculateRating.score).color
                        )}
                      >
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
              if (
                question.section &&
                (index === 0 || DETAILED_QUESTIONS[index - 1].section !== question.section)
              ) {
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
                  <label className="text-sm font-medium">{question.label}</label>
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
      <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 border-t gap-4">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Generate Feedback Button */}
          <Button
            variant="secondary"
            onClick={async () => {
              if (!gameName.trim()) {
                setPendingAction("feedback");
                setShowNameModal(true);
                return;
              }
              // Save before showing feedback
              await handleSave();
              setShowFeedbackModal(true);
            }}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Generate Feedback
            {(allSelectedIssues.length + failedChecksWithoutIssues.length) > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">
                {allSelectedIssues.length + failedChecksWithoutIssues.length}
              </Badge>
            )}
          </Button>

          <Button onClick={() => handleSave()} disabled={isSaving}>
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        selectedIssues={allSelectedIssues}
        failedChecks={failedChecksWithoutIssues}
        onFeedbackTextChange={setFeedbackText}
      />

      {/* Game Name Input Modal */}
      <GameNameModal
        isOpen={showNameModal}
        onClose={() => {
          setShowNameModal(false);
          setPendingAction(null);
        }}
        onSave={async (name) => {
          setGameName(name);
          setShowNameModal(false);
          // Save the result first (pass name directly as state update is async)
          await handleSave(name);
          // Execute pending action
          if (pendingAction === "rating") {
            setShowRating(true);
            setToast({ message: "Результаты сохранены", type: "success" });
          } else if (pendingAction === "feedback") {
            setShowFeedbackModal(true);
            setToast({ message: "Результаты сохранены", type: "success" });
          } else if (pendingAction === "save") {
            // Save Results: just show toast, no redirect
            setToast({ message: "Результаты сохранены", type: "success" });
          }
          setPendingAction(null);
        }}
        initialName={gameName}
      />

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
