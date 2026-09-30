import type { Metadata } from "next";
export const metadata: Metadata = { title: "Life — polovinka.work", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function LifeLayout({ children }: { children: React.ReactNode }) { return children; }
