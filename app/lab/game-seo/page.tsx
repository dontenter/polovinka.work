"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  History,
  Plus,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Star,
  AlertCircle,
  MessageCircleQuestion,
  Edit3,
  Pencil,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Toast } from "@/components/ui/toast";
import {
  saveGameSeoResult,
  getGameSeoResultById,
  generateId,
  type SeoBlock,
  type SeoBlockItem,
  type FaqGroup,
  type FaqItem,
  type GameSeoResult,
} from "@/lib/game-seo-storage";

// ==================== CONFIG ====================

const DEFAULT_BLOCKS: SeoBlock[] = [
  {
    id: "key_features",
    label: "Key Features",
    labelRu: "Особенности игры",
    description: "Только то, что реально есть в игре: режимы, число уровней, мультиплеер, кастомизация, ачивки, дейлики. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "tips",
    label: "Tips & Tricks",
    labelRu: "Советы и хитрости",
    description: "Реальные советы из вашего прохождения. Не общие фразы вроде 'have fun'. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "upgrades",
    label: "Upgrades / Progression / Economy",
    labelRu: "Прокачка / Экономика",
    description: "Что улучшается и за что покупается. Пишите связку 'зарабатываешь X → покупаешь Y' только если видели её в игре явно. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "levels",
    label: "Levels / Maps / Worlds",
    labelRu: "Уровни / Миры / Карты",
    description: "Точное число уровней и структура: миры, сложности, что меняется между уровнями. Если не уверены — оставьте число пустым. Если нечего добавить — не придумывайте.",
    items: [],
    meta: { variant: "Levels" },
  },
  {
    id: "game_modes",
    label: "Game Modes",
    labelRu: "Режимы игры",
    description: "Минимум 2 названных режима. Названия — дословно из UI игры. Если нет второго реального режима, не выдумывайте 'Classic mode'. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "vehicles",
    label: "Vehicles / Cars",
    labelRu: "Транспорт / Машины",
    description: "Названия транспорта и детали: скорость, как открывается. Только если игра это показывает. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "characters",
    label: "Characters / Heroes / Skins",
    labelRu: "Персонажи / Скины",
    description: "Минимум 2 названных персонажа/скина. 'Есть разные скины' без названий — это пункт Особенности игры, не отдельный блок. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "weapons",
    label: "Weapons / Gear / Items",
    labelRu: "Оружие / Предметы",
    description: "Названия и детали: эффект, где встречается. Если нечего добавить — не придумывайте.",
    items: [],
    meta: { variant: "Weapons" },
  },
  {
    id: "enemies",
    label: "Enemies / Bosses",
    labelRu: "Враги / Боссы",
    description: "Названия врагов/боссов и чем опасны. Описывайте словами игры, не аналитическими ярлыками. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "powerups",
    label: "Power-ups / Abilities",
    labelRu: "Усиления / Способности",
    description: "Названия пауэр-апов и их эффект. Если нечего добавить — не придумывайте.",
    items: [],
  },
  {
    id: "story",
    label: "Story / Setting",
    labelRu: "Сюжет / Сеттинг",
    description: "Только то, что игра сама показывает: интро, катсцены, тексты. Не додумывайте предысторию. Если нечего добавить — не придумывайте.",
    items: [],
  },
];

const LEVEL_VARIANTS = ["Levels", "Worlds", "Maps", "Stages"];
const WEAPON_VARIANTS = ["Weapons", "Gear", "Items"];

const DEFAULT_FAQ_GROUPS: FaqGroup[] = [
  {
    id: "core",
    labelRu: "Базовый геймплей и сюжет",
    labelEn: "Core Gameplay & Story",
    items: [],
  },
  {
    id: "mechanics",
    labelRu: "Механики и прогрессия",
    labelEn: "Mechanics & Progression",
    items: [],
  },
  {
    id: "economy",
    labelRu: "Экономика и кастомизация",
    labelEn: "Economy & Customization",
    items: [],
  },
  {
    id: "retention",
    labelRu: "Удержание и вовлечение",
    labelEn: "Retention & Engagement",
    items: [],
  },
];

const FAQ_PRESETS: Record<string, string[]> = {
  core: [
    "В чём цель игры?",
    "Как победить / что считается проигрышем?",
    "Есть ли сюжет?",
    "Что цепляет в первые минуты?",
  ],
  mechanics: [
    "Сколько уровней / понятна ли структура?",
    "Что открывается по мере игры?",
    "Меняется ли сложность?",
    "Как прокачиваться быстрее?",
  ],
  economy: [
    "Что можно купить/улучшить?",
    "Есть ли скины / кастомизация?",
    "Что доступно с самого старта?",
  ],
  retention: [
    "Есть ли дейлики / колесо фортуны / ачивки / таски?",
    "Есть ли лидерборды и как работают?",
    "Нужен ли звук?",
    "Какие есть ачивки и за что можно их получить?",
    "Есть ли онбординг в игре? Что там?",
  ],
};

function mergeLoadedBlocks(loadedBlocks: SeoBlock[]): SeoBlock[] {
  const loadedMap = new Map(loadedBlocks.map((b) => [b.id, b]));
  const merged = DEFAULT_BLOCKS.map((defaultBlock) => {
    const loaded = loadedMap.get(defaultBlock.id);
    if (!loaded) {
      return {
        ...defaultBlock,
        items: [],
        meta: defaultBlock.meta ? { ...defaultBlock.meta } : undefined,
      };
    }
    return {
      ...defaultBlock,
      ...loaded,
      meta:
        defaultBlock.meta || loaded.meta
          ? { ...defaultBlock.meta, ...loaded.meta }
          : undefined,
    };
  });

  // Preserve any custom blocks that are not in the current defaults.
  const defaultIds = new Set(DEFAULT_BLOCKS.map((b) => b.id));
  const extra = loadedBlocks.filter((b) => !defaultIds.has(b.id));
  return [...merged, ...extra];
}

function mergeLoadedFaqGroups(loadedGroups: FaqGroup[]): FaqGroup[] {
  const loadedMap = new Map(loadedGroups.map((g) => [g.id, g]));
  const autoConfirm = (item: FaqItem): FaqItem => ({
    ...item,
    confirmed:
      item.confirmed ||
      (!isEmptyAnswer(item.question) && !isEmptyAnswer(item.answer)),
  });

  const merged = DEFAULT_FAQ_GROUPS.map((defaultGroup) => {
    const loaded = loadedMap.get(defaultGroup.id);
    return loaded
      ? { ...defaultGroup, items: loaded.items.map(autoConfirm) }
      : { ...defaultGroup, items: [] };
  });

  const defaultIds = new Set(DEFAULT_FAQ_GROUPS.map((g) => g.id));
  const extra = loadedGroups
    .filter((g) => !defaultIds.has(g.id))
    .map((g) => ({ ...g, items: g.items.map(autoConfirm) }));
  return [...merged, ...extra];
}

// ==================== HELPERS ====================

function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

function isEmptyAnswer(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "-" || trimmed.toLowerCase() === "неприменимо" || trimmed.toLowerCase() === "нет информации";
}

function validBlockItems(block: SeoBlock): SeoBlockItem[] {
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

function validFaqItems(group: FaqGroup): FaqItem[] {
  return group.items.filter(
    (item) => item.confirmed && !isEmptyAnswer(item.question) && !isEmptyAnswer(item.answer)
  );
}

function buildContext(
  gameName: string,
  controls: string,
  blocks: SeoBlock[],
  faqGroups: FaqGroup[]
): string {
  const parts: string[] = [];

  // Controls
  const controlsTrimmed = controls.trim();
  if (controlsTrimmed) {
    parts.push(`Controls:\n${controlsTrimmed}`);
  }

  // Deep-content blocks
  for (const block of blocks) {
    const validItems = validBlockItems(block);
    const label = block.customLabel?.trim() || block.label;

    if (block.id === "levels") {
      const lines: string[] = [];
      const count = block.meta?.count?.trim();
      const structure = block.meta?.structure?.trim();
      if (count) lines.push(`${count} ${(block.meta?.variant || "Levels").toLowerCase()}`);
      if (structure) lines.push(structure);
      for (const item of validItems) {
        if (item.name && item.detail) lines.push(`${item.name}: ${item.detail}`);
        else if (item.name) lines.push(item.name);
        else if (item.detail) lines.push(item.detail);
      }
      if (lines.length >= 2 || (count && structure)) {
        parts.push(`${label}:\n${lines.map((l) => `• ${l}`).join("\n")}`);
      }
      continue;
    }

    if (block.id === "story") {
      const structure = block.meta?.structure?.trim();
      if (structure && !validItems.length) {
        parts.push(`${label}:\n${structure}`);
        continue;
      }
    }

    if (!blockMeetsThreshold(block)) continue;

    if (block.id === "tips") {
      const regular = validItems.filter((item) => !item.advanced);
      const advanced = validItems.filter((item) => item.advanced);
      const lines: string[] = [];
      for (const item of regular) {
        if (item.name && item.detail) lines.push(`${item.name}: ${item.detail}`);
        else if (item.name) lines.push(item.name);
        else if (item.detail) lines.push(item.detail);
      }
      if (lines.length > 0) {
        parts.push(`${label}:\n${lines.map((l) => `• ${l}`).join("\n")}`);
      }
      if (advanced.length >= 2) {
        const advancedLines: string[] = [];
        for (const item of advanced) {
          if (item.name && item.detail) advancedLines.push(`${item.name}: ${item.detail}`);
          else if (item.name) advancedLines.push(item.name);
          else if (item.detail) advancedLines.push(item.detail);
        }
        parts.push(`Advanced Moves:\n${advancedLines.map((l) => `• ${l}`).join("\n")}`);
      }
      continue;
    }

    const lines: string[] = [];
    for (const item of validItems) {
      if (item.name && item.detail) lines.push(`${item.name}: ${item.detail}`);
      else if (item.name) lines.push(item.name);
      else if (item.detail) lines.push(item.detail);
    }
    parts.push(`${label}:\n${lines.map((l) => `• ${l}`).join("\n")}`);
  }

  // FAQ
  const validFaqGroups = faqGroups.filter((group) => validFaqItems(group).length > 0);
  if (validFaqGroups.length > 0) {
    for (const group of validFaqGroups) {
      const items = validFaqItems(group);
      const qaLines = items.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n");
      parts.push(`${group.labelEn}\n${qaLines}`);
    }
  }

  return parts.join("\n\n");
}

// ==================== COMPONENTS ====================

function BlockCard({
  block,
  onChange,
}: {
  block: SeoBlock;
  onChange: (updated: SeoBlock) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const validItems = validBlockItems(block);
  const meetsThreshold = blockMeetsThreshold(block);

  const handleAdd = () => {
    onChange({ ...block, items: [...block.items, { name: "", detail: "" }] });
  };

  const handleRemove = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    onChange({ ...block, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof SeoBlockItem, value: string | boolean) => {
    const newItems = block.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...block, items: newItems });
  };

  const handleMetaChange = (field: "count" | "structure" | "variant", value: string) => {
    onChange({ ...block, meta: { ...block.meta, [field]: value } });
  };

  const showAdvancedToggle = block.id === "tips";
  const showBestToggle = block.id === "weapons";
  const isLevels = block.id === "levels";
  const isWeapons = block.id === "weapons";

  return (
    <Card className={cn("overflow-hidden", meetsThreshold && "border-green-200 dark:border-green-800")}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="hover:bg-muted/30 transition-colors pr-6">
          <CardHeader className="pb-3 text-left">
            <div className="flex items-center justify-between gap-4 pr-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-base font-medium">
                    {block.labelRu}
                  </CardTitle>
                  {block.id === "levels" && block.meta?.variant && block.meta.variant !== "Levels" && (
                    <Badge variant="outline" className="text-xs">
                      {block.meta.variant}
                    </Badge>
                  )}
                  {block.id === "weapons" && block.meta?.variant && block.meta.variant !== "Weapons" && (
                    <Badge variant="outline" className="text-xs">
                      {block.meta.variant}
                    </Badge>
                  )}
                </div>
                {block.description && (
                  <CardDescription className="mt-1">{block.description}</CardDescription>
                )}
              </div>
              {meetsThreshold && (
                <Badge variant="success" className="hidden sm:inline-flex shrink-0">
                  OK
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Levels special fields */}
            {isLevels && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Количество уровней</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Только точное число"
                    value={block.meta?.count || ""}
                    onChange={(e) => handleMetaChange("count", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ярлык</label>
                  <select
                    value={block.meta?.variant || "Levels"}
                    onChange={(e) => handleMetaChange("variant", e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {LEVEL_VARIANTS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium">Структура</label>
                  <Textarea
                    placeholder="Опишите структуру: миры, сложности, что меняется между уровнями..."
                    value={block.meta?.structure || ""}
                    onChange={(e) => handleMetaChange("structure", e.target.value)}
                    className="min-h-[80px] resize-y"
                  />
                </div>
              </div>
            )}

            {/* Story special field */}
            {block.id === "story" && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <label className="text-sm font-medium">Описание сеттинга / сюжета</label>
                <Textarea
                  placeholder="Только то, что игра сама показывает. Не додумывайте предысторию."
                  value={block.meta?.structure || ""}
                  onChange={(e) => handleMetaChange("structure", e.target.value)}
                  className="min-h-[100px] resize-y"
                />
              </div>
            )}

            {/* Variant selector for weapons */}
            {isWeapons && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <label className="text-sm font-medium">Ярлык блока</label>
                <select
                  value={block.meta?.variant || "Weapons"}
                  onChange={(e) => handleMetaChange("variant", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {WEAPON_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Items */}
            <div className="space-y-3">
              {block.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-3 rounded-lg border border-border bg-muted/20">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-xs text-muted-foreground">Название</label>
                    <Input
                      placeholder={block.id === "tips" ? "Совет" : "Название из игры"}
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="sm:col-span-7 space-y-1">
                    <label className="text-xs text-muted-foreground">Деталь</label>
                    <Textarea
                      placeholder="Чем отличается, эффект, где встречается..."
                      value={item.detail}
                      onChange={(e) => handleItemChange(index, "detail", e.target.value)}
                      className="min-h-[60px] resize-y text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end gap-1">
                    {showAdvancedToggle && (
                      <button
                        type="button"
                        title="Продвинутая техника"
                        onClick={() => handleItemChange(index, "advanced", !item.advanced)}
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          item.advanced
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    )}
                    {showBestToggle && (
                      <button
                        type="button"
                        title="Лучший элемент"
                        onClick={() => handleItemChange(index, "best", !item.best)}
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          item.best
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Добавить элемент
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function FaqGroupCard({
  group,
  onChange,
}: {
  group: FaqGroup;
  onChange: (updated: FaqGroup) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const validItems = validFaqItems(group);
  const totalItems = group.items.length;

  const handleAdd = (presetQuestion: string) => {
    onChange({
      ...group,
      items: [...group.items, { question: presetQuestion, answer: "", confirmed: false }],
    });
    if (!isOpen) setIsOpen(true);
  };

  const handleRemove = (index: number) => {
    onChange({ ...group, items: group.items.filter((_, i) => i !== index) });
  };

  const handleItemChange = (index: number, field: keyof FaqItem, value: string | boolean) => {
    onChange({
      ...group,
      items: group.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    });
  };

  const handleConfirm = (index: number) => {
    handleItemChange(index, "confirmed", true);
  };

  const handleEdit = (index: number) => {
    handleItemChange(index, "confirmed", false);
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="hover:bg-muted/30 transition-colors pr-6">
          <CardHeader className="pb-3 text-left">
            <div className="flex items-center justify-between gap-4 pr-8">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-medium">{group.labelRu}</CardTitle>
                <CardDescription className="mt-1">
                  Выберите вопросы из списка и ответьте на них. Если на какой-то вопрос нечего ответить — просто не добавляйте его.
                </CardDescription>
              </div>
              {validItems.length >= 2 && (
                <Badge variant="success" className="hidden sm:inline-flex shrink-0">
                  OK
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {(FAQ_PRESETS[group.id] || []).map((preset) => {
                const alreadyAdded = group.items.some((item) => item.question === preset);
                return (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={alreadyAdded}
                    onClick={() => handleAdd(preset)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {preset}
                  </Button>
                );
              })}
            </div>

            {/* Items */}
            <div className="space-y-4">
              {group.items.map((item, index) => {
                if (item.confirmed) {
                  return (
                    <div key={index} className="space-y-2 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.question}</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.answer}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEdit(index)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title="Редактировать"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={index} className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs text-muted-foreground">Вопрос</label>
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={item.question}
                      readOnly
                      className="text-sm bg-muted/30"
                    />
                    <Textarea
                      placeholder="Ответ..."
                      value={item.answer}
                      onChange={(e) => handleItemChange(index, "answer", e.target.value)}
                      className="min-h-[100px] resize-y text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleConfirm(index)}
                      disabled={isEmptyAnswer(item.answer)}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Done
                    </Button>
                  </div>
                );
              })}
            </div>

            {totalItems === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Выберите вопрос выше, чтобы добавить ответ
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ==================== MAIN PAGE ====================

function GameSeoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gameName, setGameName] = useState("");
  const [controls, setControls] = useState("");
  const [blocks, setBlocks] = useState<SeoBlock[]>(DEFAULT_BLOCKS);
  const [faqGroups, setFaqGroups] = useState<FaqGroup[]>(DEFAULT_FAQ_GROUPS);
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const context = useMemo(
    () => buildContext(gameName, controls, blocks, faqGroups),
    [gameName, controls, blocks, faqGroups]
  );

  const stats = useMemo(() => {
    const activeBlocks = blocks.filter((b) => blockMeetsThreshold(b)).length;
    const totalFaq = faqGroups.reduce((sum, g) => sum + validFaqItems(g).length, 0);
    return { activeBlocks, totalFaq };
  }, [blocks, faqGroups]);

  // Load an existing result when ?id= is present
  useEffect(() => {
    const editId = searchParams.get("id");
    if (!editId) {
      setIsLoadingEdit(false);
      return;
    }

    setIsLoadingEdit(true);
    getGameSeoResultById(editId)
      .then((result) => {
        if (!result) {
          setToast({ message: "Результат не найден", type: "error" });
          return;
        }
        setGameName(result.gameName);
        setControls(result.controls || "");
        setBlocks(mergeLoadedBlocks(result.blocks));
        setFaqGroups(mergeLoadedFaqGroups(result.faqGroups));
        setGeneratedText(result.generatedText);
        setCurrentResultId(result.id);
      })
      .catch((err) => {
        setToast({
          message: err instanceof Error ? err.message : "Failed to load result",
          type: "error",
        });
      })
      .finally(() => {
        setIsLoadingEdit(false);
      });
  }, [searchParams]);

  const handleBlockChange = (index: number, updated: SeoBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)));
  };

  const handleFaqGroupChange = (index: number, updated: FaqGroup) => {
    setFaqGroups((prev) => prev.map((g, i) => (i === index ? updated : g)));
  };

  const resetState = () => {
    setGameName("");
    setControls("");
    setBlocks(
      DEFAULT_BLOCKS.map((b) => ({
        ...b,
        items: [],
        meta: b.meta ? { ...b.meta } : undefined,
      }))
    );
    setFaqGroups(DEFAULT_FAQ_GROUPS.map((g) => ({ ...g, items: [] })));
    setGeneratedText("");
    setCurrentResultId(null);
    setCopied(false);
  };

  const handleReset = () => {
    if (confirm("Сбросить всё и начать заново?")) {
      resetState();
      router.replace("/lab/game-seo");
    }
  };

  const handleNewGame = () => {
    resetState();
    router.replace("/lab/game-seo");
  };

  const handleSave = useCallback(
    async (
      nameToUse: string,
      controlsToUse: string,
      blocksToUse: SeoBlock[],
      faqGroupsToUse: FaqGroup[],
      textToUse: string,
      existingId?: string | null
    ) => {
      const resultId = existingId || generateId();

      const result: GameSeoResult = {
        id: resultId,
        gameName: nameToUse.trim(),
        controls: controlsToUse.trim(),
        date: new Date().toISOString(),
        blocks: blocksToUse,
        faqGroups: faqGroupsToUse,
        generatedText: textToUse,
      };

      try {
        setIsSaving(true);
        await saveGameSeoResult(result);
        setCurrentResultId(resultId);
        return resultId;
      } catch (error) {
        console.error("Save error:", error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!gameName.trim()) {
      setToast({ message: "Введите название игры", type: "error" });
      return;
    }

    if (!context.trim()) {
      setToast({ message: "Заполните хотя бы один блок или пару вопрос-ответ", type: "error" });
      return;
    }

    setIsGenerating(true);
    setGeneratedText("");

    try {
      const response = await fetch("/api/generate-seo-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details?.error?.message || data.error || "Failed to generate description";
        throw new Error(errorMsg);
      }

      const description = data.description;
      setGeneratedText(description);

      await handleSave(
        gameName,
        controls,
        blocks,
        faqGroups,
        description,
        currentResultId
      );
      setToast({ message: "Текст сгенерирован и сохранён", type: "success" });
    } catch (error) {
      console.error("Generation error:", error);
      setToast({
        message: "Ошибка при генерации: " + (error as Error).message,
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [gameName, controls, context, blocks, faqGroups, currentResultId, handleSave]);

  const handleManualSave = useCallback(async () => {
    if (!gameName.trim()) {
      setToast({ message: "Введите название игры", type: "error" });
      return;
    }

    try {
      await handleSave(
        gameName,
        controls,
        blocks,
        faqGroups,
        generatedText,
        currentResultId
      );
      setToast({ message: "Изменения сохранены", type: "success" });
    } catch (error) {
      console.error("Manual save error:", error);
      setToast({
        message: "Ошибка при сохранении: " + (error as Error).message,
        type: "error",
      });
    }
  }, [gameName, controls, blocks, faqGroups, generatedText, currentResultId, handleSave]);

  const handleCopy = async () => {
    if (!generatedText) return;
    await navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
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
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground flex items-center gap-3 flex-wrap">
              <FileText className="h-8 w-8 sm:h-9 sm:w-9 text-accent" />
              Game SEO Text
              {currentResultId && (
                <Badge variant="outline" className="text-sm font-normal px-3 py-1">
                  Редактирование
                </Badge>
              )}
            </h1>
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
              onClick={() => router.push("/lab/game-seo/history")}
              className="hidden sm:flex"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>
        {/* Mobile Buttons */}
        <div className="mt-4 sm:hidden flex flex-col gap-2">
          <Button variant="default" onClick={handleNewGame} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            New Game
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/lab/game-seo/history")}
            className="w-full"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Game Name */}
      <div className="max-w-md mb-8 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Game Name</label>
          <Input
            placeholder="Enter the name of the game..."
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Controls</label>
          <Textarea
            placeholder={`Desktop: WASD / arrow keys / mouse / spacebar...\nMobile: tap / swipe / hold / virtual joystick...`}
            value={controls}
            onChange={(e) => setControls(e.target.value)}
            className="min-h-[100px] resize-y"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Укажите, как управлять игрой. Обязательно распишите и десктопные контролы
            (клавиши, мышь), и мобильные (тапы, свайпы, виртуальные кнопки).
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* FAQ Questionnaire */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-accent" />
                Анкета (FAQ)
              </h2>

            </div>
            <div className="space-y-3">
              {faqGroups.map((group, index) => (
                <FaqGroupCard
                  key={group.id}
                  group={group}
                  onChange={(updated) => handleFaqGroupChange(index, updated)}
                />
              ))}
            </div>
          </div>

          {/* Deep-content blocks */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                Deep-content блоки
              </h2>
              <Badge variant="secondary">
                {stats.activeBlocks} / {blocks.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  onChange={(updated) => handleBlockChange(index, updated)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Preview & Actions */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generated SEO Text</CardTitle>
                <CardDescription>
                  Итоговый английский текст для страницы игры
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isSaving}
                  className="w-full"
                  variant="default"
                >
                  {isGenerating || isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isGenerating ? "Generating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Text
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleManualSave}
                  disabled={isSaving || isGenerating || isLoadingEdit || !gameName.trim()}
                  className="w-full"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4 mr-2" />
                  )}
                  Сохранить изменения
                </Button>

                {generatedText && (
                  <div className="space-y-2 pt-2">
                    <Textarea
                      value={generatedText}
                      readOnly={!currentResultId}
                      onChange={(e) => setGeneratedText(e.target.value)}
                      className="min-h-[500px] resize-y bg-muted/50 font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Raw context preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Контекст для перевода</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={context}
                  readOnly
                  className="min-h-[200px] resize-y bg-muted/30 text-xs font-mono"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between pt-6 border-t gap-4">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

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

export default function GameSeoPage() {
  return (
    <Suspense
      fallback={
        <div className="container max-w-6xl mx-auto px-4 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading editor...</p>
        </div>
      }
    >
      <GameSeoPageContent />
    </Suspense>
  );
}
