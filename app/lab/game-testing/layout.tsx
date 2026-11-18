import { cookies } from "next/headers";
import { GameTestingTheme } from "@/components/game-testing-theme";

export default async function GameTestingLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("game_testing_theme")?.value;
  return <GameTestingTheme initialTheme={theme === "light" ? "light" : "dark"}>{children}</GameTestingTheme>;
}
