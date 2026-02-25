import type { Metadata } from "next";
import { Outfit, Orbitron } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-game",
});

export const metadata: Metadata = {
  title: "Pavel Polovinka — polovinka.work",
  description:
    "Products / Operations / Startups. Gamedev. Indonesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${orbitron.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-50 w-full border-b-2 border-game-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container flex h-14 max-w-2xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-sm font-bold tracking-wider text-foreground hover:text-accent transition-colors"
              style={{ fontFamily: "var(--font-game), var(--font-outfit)" }}
            >
              polovinka.work
            </Link>
            <SiteNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
