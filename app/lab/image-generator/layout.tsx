import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Generator — Lab — polovinka.work",
  description:
    "Генерация обложек игр по иконке 800×800. Выход: 1920×1080 и 1080×1920 (Nano Banana).",
};

export default function ImageGeneratorLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
