export type BrazilCurrency = "BRL" | "USD";
export type BrazilExchangeRate = { rate: number; date: string };
export const exchangeRateSource = "https://api.frankfurter.dev/v2/providers/ecb/rate/usd/brl";
// Last verified ECB reference quote; always display its date, including on network failure.
const fallback: BrazilExchangeRate = { rate: 5.0465, date: "2026-10-23" };
export async function getBrazilExchangeRate(): Promise<BrazilExchangeRate> {
  try {
    const response = await fetch(exchangeRateSource, { next: { revalidate: 21600 }, signal: AbortSignal.timeout(3000) });
    if (!response.ok) return fallback;
    const data = await response.json();
    if (data.base !== "USD" || data.quote !== "BRL" || typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0 || typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return fallback;
    return { rate: data.rate, date: data.date };
  } catch { return fallback; }
}
export function formatBrazilMoney(amountBRL: number, currency: BrazilCurrency, rate: number): string {
  const amount = currency === "USD" ? amountBRL / rate : amountBRL;
  return (currency === "USD" ? "≈ $ " : "R$ ") + new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount);
}
