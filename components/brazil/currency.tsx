"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { formatBrazilMoney, type BrazilCurrency, type BrazilExchangeRate } from "@/lib/brazil-currency";
const storageKey = "life-brazil-currency-v1";
type CurrencyContext = { currency: BrazilCurrency; setCurrency: (currency: BrazilCurrency) => void; quote: BrazilExchangeRate; money: (amountBRL: number) => string };
const CurrencyContext = createContext<CurrencyContext | null>(null);
export function BrazilCurrencyProvider({ quote, children }: { quote: BrazilExchangeRate; children: React.ReactNode }) {
  const [currency, updateCurrency] = useState<BrazilCurrency>("BRL");
  useEffect(() => {
    try { if (localStorage.getItem(storageKey) === "USD") updateCurrency("USD"); } catch {}
    const sync = (event: StorageEvent) => { if (event.key === storageKey) updateCurrency(event.newValue === "USD" ? "USD" : "BRL"); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const setCurrency = (value: BrazilCurrency) => {
    updateCurrency(value);
    try { localStorage.setItem(storageKey, value); } catch {}
  };
  return <CurrencyContext.Provider value={{ currency, setCurrency, quote, money: amount => formatBrazilMoney(amount, currency, quote.rate) }}>{children}</CurrencyContext.Provider>;
}
export function useBrazilCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("BrazilCurrencyProvider is required");
  return context;
}
export function BrazilCurrencySwitch() {
  const { currency, setCurrency } = useBrazilCurrency();
  return <div className="brazil-currency"><div className="currency-buttons" role="group" aria-label="Валюта цен">{(["BRL", "USD"] as const).map(value => <button key={value} type="button" aria-label={value === "BRL" ? "Реалы" : "Доллары"} aria-pressed={currency === value} onClick={() => setCurrency(value)}>{value === "BRL" ? "R$" : "$"}</button>)}</div></div>;
}
