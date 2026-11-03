import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { requireLifeSession } from "@/lib/life-auth";
import { BrazilNavigation } from "@/components/brazil/navigation";
import { BrazilCurrencyProvider, BrazilCurrencySwitch } from "@/components/brazil/currency";
import { getBrazilExchangeRate } from "@/lib/brazil-currency";
import "./brazil.css";
import "./design.css";
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-brazil", display: "swap" });
export const metadata: Metadata = { title: "Brazil · Life — polovinka.work", robots: {index: false, follow: false} };
export default async function BrazilLayout({children}: {children: React.ReactNode}) {
  await requireLifeSession("/life/brazil");
  const quote = await getBrazilExchangeRate();
  return <BrazilCurrencyProvider quote={quote}><main className={`brazil ${manrope.variable}`} lang="ru"><a className="brazil-skip" href="#brazil-content">Перейти к содержимому</a><div className="brazil-shell"><BrazilNavigation/><div className="brazil-content" id="brazil-content" tabIndex={-1}><header className="brazil-heading"><h1>Флорианополис</h1><div className="brazil-heading-controls"><BrazilCurrencySwitch/></div></header>{children}</div></div></main></BrazilCurrencyProvider>;
}
