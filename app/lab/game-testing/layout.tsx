import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Testing — Lab — polovinka.work",
  description: "Game rating and feedback system for developers",
};

export default function GameTestingLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
