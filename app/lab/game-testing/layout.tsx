import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GameTestingTheme } from "@/components/game-testing-theme";

export const metadata: Metadata = {
  title: "Game Testing — Lab — polovinka.work",
  description: "Game rating and feedback system for developers",
};

export default async function GameTestingLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("game_testing_theme")?.value;
  return <GameTestingTheme initialTheme={theme === "light" ? "light" : "dark"}>{children}</GameTestingTheme>;
}
