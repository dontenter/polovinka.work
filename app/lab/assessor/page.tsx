import { cookies } from "next/headers";
import { assessorThemeCookie } from "@/lib/assessor-theme";
import AssessorPage from "./assessor-page";

export default async function Page() {
  const theme = (await cookies()).get(assessorThemeCookie)?.value;
  return <AssessorPage initialTheme={theme === "light" ? "light" : "dark"} />;
}
