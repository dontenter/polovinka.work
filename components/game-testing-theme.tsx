"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; chooseTheme: (theme: Theme) => void } | null>(null);

export function GameTestingTheme({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    setTheme(document.cookie.split(/;\s*/).includes("game_testing_theme=light") ? "light" : "dark");
  }, []);

  function chooseTheme(next: Theme) {
    setTheme(next);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `game_testing_theme=${next}; Path=/lab/game-testing; Max-Age=31536000; SameSite=Lax${secure}`;
  }

  return (
    <ThemeContext.Provider value={{ theme, chooseTheme }}>
      <div data-game-testing-theme={theme} className={theme === "dark" ? "dark" : undefined}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function GameTestingThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Game Testing theme provider is missing");

  return (
    <div role="group" aria-label="Color theme" className="inline-flex gap-1 rounded-lg border border-border bg-card p-1">
      {(["light", "dark"] as const).map(theme => (
        <Button key={theme} type="button" variant="ghost" size="sm"
          aria-pressed={context.theme === theme} onClick={() => context.chooseTheme(theme)}
          className="h-7 px-2 text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground focus-visible:ring-accent focus-visible:ring-offset-background">
          {theme === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          {theme === "light" ? "Light" : "Dark"}
        </Button>
      ))}
    </div>
  );
}
