import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Generator — Lab — polovinka.work",
  description:
    "Generate game covers from an 800×800 icon. Output: 1920×1080 and 1080×1920 (Nano Banana).",
};

export default function ImageGeneratorLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
