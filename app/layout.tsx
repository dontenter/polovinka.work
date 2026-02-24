import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Pavel Polovinka — polovinka.work",
  description:
    "Product & Business Development. 13+ years building products at scale. This is how I work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-5xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
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
