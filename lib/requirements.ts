import requirementsData from "./requirements-data.json";

export interface SubRequirement {
  issue: string;
  feedback_en: string;
  feedback_ru: string;
  type?: "bug" | "recommendation"; // recommendation = optional suggestion, not a critical bug
}

export interface Requirement {
  id: number;
  requirement: string;
  requirement_en: string;
  sub_requirements: SubRequirement[];
}

// Export the requirements data
export const REQUIREMENTS: Requirement[] = requirementsData as Requirement[];

// Map requirement IDs to check IDs used in the UI
export const REQUIREMENT_ID_MAP: Record<number, string> = {
  1: "sdk",
  2: "content",
  3: "crashes",
  4: "ui_scale",
  5: "english",
  6: "progress_save",
  7: "sound",
  8: "interstitial_ads",
  9: "rewarded_ads",
  10: "continue_no_ads",
  11: "pause_ads",
  12: "sound_mute_ads",
  13: "mute_button",
  14: "mobile_support",
  15: "auth",
  16: "languages",
  17: "multiplayer",
  18: "leaderboard_play",
  19: "leaderboard_reload",
  20: "leaderboard_record",
  21: "iap_purchase",
  22: "iap_reload",
  23: "iap_non_consumable",
  24: "social_toggle",
};

// Reverse map from check ID to requirement ID
export const CHECK_ID_TO_REQUIREMENT: Record<string, number> = Object.entries(
  REQUIREMENT_ID_MAP
).reduce((acc, [reqId, checkId]) => {
  acc[checkId] = parseInt(reqId);
  return acc;
}, {} as Record<string, number>);

// Get requirement by check ID
export function getRequirementByCheckId(checkId: string): Requirement | undefined {
  const reqId = CHECK_ID_TO_REQUIREMENT[checkId];
  if (!reqId) return undefined;
  return REQUIREMENTS.find((r) => r.id === reqId);
}

// Check if a requirement has sub-requirements
export function hasSubRequirements(checkId: string): boolean {
  const req = getRequirementByCheckId(checkId);
  return !!req && req.sub_requirements.length > 0;
}

// Generate feedback based on selected issues
export interface SelectedIssue {
  requirementId: number;
  issueIndex: number;
}

// Failed check without specific issues selected
export interface FailedCheck {
  requirementId: number;
  itemLabel?: string; // optional label for feature check items
}

export function generateFeedback(
  selectedIssues: SelectedIssue[],
  failedChecks: FailedCheck[] = [],
  language: "en" | "ru" = "en",
  existingRecommendations?: string[]
): string {
  if (selectedIssues.length === 0 && failedChecks.length === 0 && (!existingRecommendations || existingRecommendations.length === 0)) {
    return language === "en"
      ? "All basic checks passed. The game is ready for further review."
      : "Все базовые проверки пройдены. Игра готова к дальнейшему рассмотрению.";
  }

  const feedbackField = language === "en" ? "feedback_en" : "feedback_ru";

  const lines: string[] = [];
  const recommendationLines: string[] = existingRecommendations ? [...existingRecommendations] : [];
  
  // Group issues by requirement
  const groupedByRequirement = selectedIssues.reduce((acc, issue) => {
    if (!acc[issue.requirementId]) {
      acc[issue.requirementId] = [];
    }
    acc[issue.requirementId].push(issue.issueIndex);
    return acc;
  }, {} as Record<number, number[]>);

  // Track which requirements we've already added (to avoid duplicates with failedChecks)
  const addedRequirements = new Set<number>();

  // Generate feedback for each requirement with selected issues
  Object.entries(groupedByRequirement).forEach(([reqId, issueIndices]) => {
    const requirement = REQUIREMENTS.find((r) => r.id === parseInt(reqId));
    if (!requirement) return;

    addedRequirements.add(requirement.id);

    // Use English or Russian title based on language
    const title = language === "en" ? requirement.requirement_en : requirement.requirement;
    
    // Separate bugs and recommendations
    const bugIssues: string[] = [];
    
    issueIndices.forEach((issueIndex) => {
      const subReq = requirement.sub_requirements[issueIndex];
      if (subReq) {
        const feedbackText = subReq[feedbackField as keyof SubRequirement] as string;
        if (subReq.type === "recommendation") {
          // Add recommendations directly to the recommendation lines (without requirement title)
          recommendationLines.push(`• ${feedbackText}`);
        } else {
          bugIssues.push(`• ${feedbackText}`);
        }
      }
    });
    
    // Add bugs to main lines
    if (bugIssues.length > 0) {
      lines.push(`\n[${title}]`);
      bugIssues.forEach(line => lines.push(line));
    }
  });

  // Add failed checks without specific issues
  failedChecks.forEach((failedCheck) => {
    if (addedRequirements.has(failedCheck.requirementId)) {
      // Already added this requirement with specific issues, skip
      return;
    }

    const requirement = REQUIREMENTS.find((r) => r.id === failedCheck.requirementId);
    if (!requirement) return;

    const title = language === "en" ? requirement.requirement_en : requirement.requirement;
    
    if (failedCheck.itemLabel) {
      // Feature check item - add item label
      lines.push(`\n[${title}]`);
      lines.push(`• ${failedCheck.itemLabel}`);
    } else {
      // Basic check - just add the requirement title
      lines.push(`\n[${title}]`);
      lines.push(language === "en" 
        ? "• This check has failed. Please review and fix the issue."
        : "• Эта проверка не пройдена. Пожалуйста, проверьте и исправьте проблему.");
    }
  });

  // Add recommendations section at the end (single [Optional] section)
  if (recommendationLines.length > 0) {
    const optionalHeader = language === "en" ? "\n[Optional]" : "\n[Опционально]";
    lines.push(optionalHeader);
    recommendationLines.forEach(line => lines.push(line));
  }

  return lines.join("\n").trim();
}

// Get all basic check items in order
export interface BasicCheckItem {
  id: string;
  label: string;
  description?: string;
  requirementId: number;
}

export const BASIC_CHECK_ITEMS: BasicCheckItem[] = [
  { id: "sdk", label: "SDK интегрирован", description: "Игра корректно инициализирует SDK", requirementId: 1 },
  { id: "content", label: "Нет спорного контента / IP", description: "Нет нарушений авторских прав и спорного контента", requirementId: 2 },
  { id: "crashes", label: "Нет крэшей", description: "Игра стабильна, не падает во время gameplay", requirementId: 3 },
  { id: "ui_scale", label: "Нет кривого UI в разных режимах Scale", description: "UI корректно отображается при изменении размеров браузера", requirementId: 4 },
  { id: "english", label: "Английский язык по умолчанию", description: "Игра запускается на английском языке", requirementId: 5 },
  { id: "progress_save", label: "После перезагрузки страницы - прогресс сохраняется", description: "Прогресс игрока не теряется", requirementId: 6 },
  { id: "sound", label: "Есть звук в игре", description: "Игра имеет звуковое оформление", requirementId: 7 },
  { id: "interstitial_ads", label: "Interstitial реклама работает корректно", description: "Проверяем частоту и наличие interstitial рекламы", requirementId: 8 },
  { id: "rewarded_ads", label: "Rewarded реклама работает корректно", description: "Кнопки намекают что там реклама", requirementId: 9 },
  { id: "continue_no_ads", label: "Игру можно продолжать без обязательного реворда", description: "Можно пройти уровень заново без просмотра рекламы", requirementId: 10 },
  { id: "pause_ads", label: "Игра ставится на паузу при рекламе", description: "Геймлей останавливается во время показа рекламы", requirementId: 11 },
  { id: "sound_mute_ads", label: "Звук пропадает во время рекламы и при сворачивании вкладки", description: "Корректное поведение звука", requirementId: 12 },
  { id: "mute_button", label: "Есть кнопка отключения звука в игре", description: "Пользователь может выключить звук", requirementId: 13 },
  { id: "mobile_support", label: "Если есть поддержка мобайла - игра работает без проблем и зависаний", description: "Мобильная версия работает корректно", requirementId: 14 },
  { id: "auth", label: "Если есть авторизация - она работает", description: "Система авторизации функционирует", requirementId: 15 },
  { id: "languages", label: "Если есть несколько языков - игра подстраивается под выбранный язык", description: "Локализация работает корректно", requirementId: 16 },
];

// Feature check items with their requirement IDs for issue tracking
export interface FeatureCheckItem {
  id: string;
  label: string;
  requirementId: number;
}

export const FEATURE_CHECK_ITEMS: Record<string, FeatureCheckItem[]> = {
  multiplayer: [
    { id: "mp_desktop_mobile", label: "Запускаем игру и в Desktop и в мобилке. Тестируем, что игроки видят друг друга", requirementId: 17 },
  ],
  leaderboards: [
    { id: "lb_play", label: "Играем какое-то время, проигрываем. Открываем лидерборд - мы там есть", requirementId: 18 },
    { id: "lb_reload", label: "Перезагружаем страницу открываем страницу - мы там все еще есть", requirementId: 19 },
    { id: "lb_record", label: "Пробуем побить свой рекорд. Открываем лидерборд - данные там изменились", requirementId: 20 },
  ],
  iap: [
    { id: "iap_purchase", label: "Пробуем совершить покупку - все проходит, покупка начисляется", requirementId: 21 },
    { id: "iap_reload", label: "Перезагружаем страницу - видим что все купленное ранее отображается", requirementId: 22 },
    { id: "iap_non_consumable", label: "Если покупка была non-consumable - проверяем, что ее нельзя купить снова", requirementId: 23 },
  ],
  social: [
    { id: "social_toggle", label: "Кнопка шаринга пропадает, когда в Feature Control флаг Social Share отключен и наоборот", requirementId: 24 },
  ],
};
