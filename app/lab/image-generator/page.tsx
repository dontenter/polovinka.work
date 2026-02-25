"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Cropper, { Area } from "react-easy-crop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Download, ArrowLeft, Crop } from "lucide-react";

const ICON_DOWNLOAD_SIZES = [1080, 1024, 512, 450, 300, 192, 16] as const;

async function loadImageAsCanvas(url: string, width: number, height: number): Promise<HTMLCanvasElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

async function getCroppedImageBlob(
  imageUrl: string,
  cropPixels: Area,
  outputWidth: number,
  outputHeight: number
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  ctx.drawImage(
    img,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png", 0.95);
  });
}

async function getCenterCroppedBlob(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageUrl;
  });
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const targetAspect = targetWidth / targetHeight;
  const srcAspect = srcW / srcH;
  let cropW: number, cropH: number;
  if (srcAspect > targetAspect) {
    cropH = srcH;
    cropW = srcH * targetAspect;
  } else {
    cropW = srcW;
    cropH = srcW / targetAspect;
  }
  const x = (srcW - cropW) / 2;
  const y = (srcH - cropH) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, cropW, cropH, 0, 0, targetWidth, targetHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png", 0.95);
  });
}

type ImageSize =
  | "1:1"
  | "9:16"
  | "16:9"
  | "3:4"
  | "4:3"
  | "3:2"
  | "2:3"
  | "5:4"
  | "4:5"
  | "5:7"
  | "21:9";

const PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
    sizes: [
      { width: 1920, height: 1080, image_size: "16:9" as const, resizeOnly: true },
      { width: 1080, height: 1920, image_size: "9:16" as const },
      { width: 1600, height: 300, image_size: "21:9" as const },
      { width: 1200, height: 627, image_size: "16:9" as const, resizeOnly: true },
    ],
  },
  {
    id: "msn",
    name: "MSN",
    sizes: [
      { width: 1280, height: 720, image_size: "16:9" as const },
      { width: 720, height: 1280, image_size: "9:16" as const },
      { width: 1920, height: 1080, image_size: "16:9" as const },
      { width: 617, height: 500, image_size: "5:4" as const },
    ],
  },
  {
    id: "yandex",
    name: "Yandex",
    sizes: [{ width: 800, height: 470, image_size: "16:9" as const }],
  },
  {
    id: "game-distribution",
    name: "Game Distribution",
    sizes: [
      { width: 512, height: 384, image_size: "4:3" as const },
      { width: 512, height: 512, image_size: "1:1" as const },
      { width: 200, height: 120, image_size: "3:2" as const },
      { width: 1280, height: 720, image_size: "16:9" as const },
      { width: 1280, height: 550, image_size: "21:9" as const },
    ],
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    sizes: [{ width: 1110, height: 684, image_size: "3:2" as const }],
  },
  {
    id: "youtube",
    name: "YouTube",
    sizes: [
      { width: 540, height: 756, image_size: "5:7" as const, deriveFrom: "9:16" as const },
      { width: 1280, height: 720, image_size: "16:9" as const, resizeOnly: true },
    ],
  },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

type OutputEntry =
  | { kind: "generate"; image_size: ImageSize; platforms: { name: string; width: number; height: number }[] }
  | { kind: "resize"; width: number; height: number; platforms: { name: string; width: number; height: number }[] }
  | {
      kind: "deriveFrom";
      sourceImageSize: ImageSize;
      width: number;
      height: number;
      platforms: { name: string; width: number; height: number }[];
    };

function getOutputSizes(selectedPlatformIds: PlatformId[]): OutputEntry[] {
  const generateByRatio = new Map<
    ImageSize,
    { image_size: ImageSize; platforms: { name: string; width: number; height: number }[] }
  >();
  const resizeByKey = new Map<string, { width: number; height: number; platforms: { name: string; width: number; height: number }[] }>();
  const deriveList: OutputEntry[] = [];
  for (const id of selectedPlatformIds) {
    const platform = PLATFORMS.find((p) => p.id === id);
    if (!platform) continue;
    for (const size of platform.sizes) {
      const { width, height, image_size } = size;
      const resizeOnly = "resizeOnly" in size && size.resizeOnly;
      const deriveFrom = "deriveFrom" in size && size.deriveFrom;
      const entry = { name: platform.name, width, height };
      if (deriveFrom) {
        deriveList.push({
          kind: "deriveFrom",
          sourceImageSize: deriveFrom,
          width,
          height,
          platforms: [entry],
        });
        if (!generateByRatio.has(deriveFrom)) {
          generateByRatio.set(deriveFrom, { image_size: deriveFrom, platforms: [entry] });
        } else {
          const existing = generateByRatio.get(deriveFrom)!;
          const isDup = existing.platforms.some((p) => p.name === entry.name && p.width === width && p.height === height);
          if (!isDup) existing.platforms.push(entry);
        }
      } else if (resizeOnly) {
        const key = `${width}-${height}`;
        const existing = resizeByKey.get(key);
        if (existing) {
          const isDup = existing.platforms.some((p) => p.name === entry.name && p.width === width && p.height === height);
          if (!isDup) existing.platforms.push(entry);
        } else {
          resizeByKey.set(key, { width, height, platforms: [entry] });
        }
      } else {
        const existing = generateByRatio.get(image_size);
        if (existing) {
          const isDup = existing.platforms.some((p) => p.name === entry.name && p.width === width && p.height === height);
          if (!isDup) existing.platforms.push(entry);
        } else {
          generateByRatio.set(image_size, { image_size, platforms: [entry] });
        }
      }
    }
  }
  const generateList = Array.from(generateByRatio.values()).map((o) => ({ kind: "generate" as const, ...o }));
  const resizeList = Array.from(resizeByKey.values()).map((o) => ({ kind: "resize" as const, ...o }));
  return [...generateList, ...resizeList, ...deriveList];
}

function getResultKey(entry: OutputEntry): string {
  if (entry.kind === "generate") return entry.image_size;
  if (entry.kind === "resize") return `resize-${entry.width}-${entry.height}`;
  return `derive-${entry.sourceImageSize}-${entry.width}-${entry.height}`;
}

const ASPECT_CLASS: Record<ImageSize, string> = {
  "1:1": "aspect-square",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
  "3:4": "aspect-[3/4]",
  "4:3": "aspect-[4/3]",
  "3:2": "aspect-[3/2]",
  "2:3": "aspect-[2/3]",
  "5:4": "aspect-[5/4]",
  "4:5": "aspect-[4/5]",
  "5:7": "aspect-[5/7]",
  "21:9": "aspect-[21/9]",
};

type TaskState = "idle" | "uploading" | "generating" | "success" | "error";

export default function ImageGeneratorPage() {
  const [sourceType, setSourceType] = useState<"cover" | "icon">("cover");
  const [coverUrl, setCoverUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const imageUrl = sourceType === "cover" ? coverUrl : iconUrl;
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(["facebook"]);
  const [taskState, setTaskState] = useState<TaskState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string | null>>({});
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [cropModal, setCropModal] = useState<{
    imageUrl: string;
    targetWidth: number;
    targetHeight: number;
    label: string;
  } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const cropAreaRef = useRef<Area | null>(null);

  const [iconState, setIconState] = useState<{
    masterUrl: string;
  } | null>(null);
  const [iconLoading, setIconLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (iconState?.masterUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(iconState.masterUrl);
      }
    };
  }, [iconState?.masterUrl]);

  const outputSizes = useMemo(() => getOutputSizes(selectedPlatforms), [selectedPlatforms]);
  const hasSelection = selectedPlatforms.length > 0;

  const togglePlatform = (id: PlatformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const onCropChangeCallback = useCallback((_cropArea: Area, croppedAreaPixels: Area) => {
    cropAreaRef.current = croppedAreaPixels;
  }, []);

  const openCropModal = (imageUrl: string, width: number, height: number, label: string) => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    cropAreaRef.current = null;
    const proxyUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl;
    setCropModal({ imageUrl: proxyUrl, targetWidth: width, targetHeight: height, label });
  };

  const handleCropDownload = useCallback(async () => {
    if (!cropModal) return;
    const area = cropAreaRef.current;
    if (!area) {
      console.warn("[Image Generator] No crop area yet, waiting for cropper…");
      return;
    }
    try {
      const blob = await getCroppedImageBlob(
        cropModal.imageUrl,
        area,
        cropModal.targetWidth,
        cropModal.targetHeight
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cover-${cropModal.targetWidth}x${cropModal.targetHeight}-${cropModal.label.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCropModal(null);
    } catch (e) {
      console.error("[Image Generator] Crop export failed:", e);
    }
  }, [cropModal]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (sourceType === "cover") setCoverUrl(value);
    else setIconUrl(value);
    setError(null);
  };

  const getIconUrl = async (): Promise<string> => {
    const url = imageUrl.trim();
    if (!url) throw new Error("Enter image URL.");
    const res = await fetch("/api/fetch-icon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch image from URL");
    return data.url;
  };

  const handleProcessIcon = useCallback(async () => {
    setError(null);
    setIconState((prev) => {
      if (prev?.masterUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.masterUrl);
      return null;
    });
    const url = imageUrl.trim();
    if (!url) {
      setError("Enter icon URL.");
      return;
    }
    setIconLoading(true);
    try {
      const resolvedUrl = await getIconUrl();
      const proxyUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(resolvedUrl)}`
          : resolvedUrl;
      const canvas = await loadImageAsCanvas(proxyUrl, 1080, 1080);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
      });
      const masterUrl = URL.createObjectURL(blob);
      setIconState({ masterUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process icon");
    } finally {
      setIconLoading(false);
    }
  }, [imageUrl]);

  const downloadIconSize = useCallback(async (size: number) => {
    if (!iconState) return;
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = iconState.masterUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `icon-${size}x${size}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png", 0.95);
    } catch (e) {
      console.error("[Image Generator] Download icon size failed:", e);
    }
  }, [iconState]);

  const pollTask = async (
    taskId: string
  ): Promise<{ ok: true; url: string } | { ok: false; errorMessage: string; debug?: unknown }> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`/api/generate-cover/status?taskId=${encodeURIComponent(taskId)}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("[Image Generator] Status request failed:", data);
        return { ok: false, errorMessage: data.error || "Status error", debug: data };
      }
      if (data.status === "success" && data.resultImageUrl) {
        return { ok: true, url: data.resultImageUrl };
      }
      if (data.status === "failed") {
        const msg = data.errorMessage || "Generation failed";
        console.error("[Image Generator] Generation failed. Full response:", data);
        return { ok: false, errorMessage: msg, debug: data.debug ?? data };
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return { ok: false, errorMessage: "Result timeout", debug: null };
  };

  const handleGenerate = async () => {
    if (sourceType !== "cover") return;
    setError(null);
    setDebugInfo(null);
    setTaskState("uploading");
    let iconUrl: string;
    try {
      iconUrl = await getIconUrl();
      console.log("[Image Generator] Cover URL resolved:", iconUrl.slice(0, 80) + (iconUrl.length > 80 ? "…" : ""));
    } catch (e) {
      console.error("[Image Generator] getIconUrl failed:", e);
      setError(e instanceof Error ? e.message : "Error");
      setTaskState("error");
      return;
    }

    setTaskState("generating");
    const initialResults: Record<string, string | null> = {};
    const initialProgress: Record<string, boolean> = {};
    for (const entry of outputSizes) {
      const key = getResultKey(entry);
      initialResults[key] = null;
      initialProgress[key] = false;
    }
    setResults((prev) => {
      Object.values(prev).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      return initialResults;
    });
    setProgress(initialProgress);

    const resultUrls: Record<string, string> = {};
    const runOne = async (image_size: ImageSize, resultKey: string) => {
      try {
        const res = await fetch("/api/generate-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ iconUrl, image_size }),
        });
        const data = await res.json();
        if (!res.ok) {
          setDebugInfo((data.details ?? data) as Record<string, unknown>);
          throw new Error(data.error || "Request error");
        }
        const taskId = data.taskId;
        const result = await pollTask(taskId);
        if (result.ok) {
          resultUrls[resultKey] = result.url;
          setResults((prev) => ({ ...prev, [resultKey]: result.url }));
        } else {
          setDebugInfo((result.debug ?? null) as Record<string, unknown> | null);
          setError(result.errorMessage);
          setTaskState("error");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation error");
        setTaskState("error");
      } finally {
        setProgress((prev) => ({ ...prev, [resultKey]: true }));
      }
    };

    const runResize = async (entry: Extract<OutputEntry, { kind: "resize" }>) => {
      const key = getResultKey(entry);
      try {
        const proxyUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(iconUrl)}`
            : iconUrl;
        const canvas = await loadImageAsCanvas(proxyUrl, entry.width, entry.height);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png", 0.95);
        });
        const url = URL.createObjectURL(blob);
        setResults((prev) => ({ ...prev, [key]: url }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Resize failed");
        setTaskState("error");
      } finally {
        setProgress((prev) => ({ ...prev, [key]: true }));
      }
    };

    const runDerive = async (entry: Extract<OutputEntry, { kind: "deriveFrom" }>, sourceUrls: Record<string, string>) => {
      const key = getResultKey(entry);
      const sourceUrl = sourceUrls[entry.sourceImageSize];
      if (!sourceUrl) return;
      try {
        const proxyUrl =
          typeof window !== "undefined" && !sourceUrl.startsWith("blob:")
            ? `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`
            : sourceUrl;
        const blob = await getCenterCroppedBlob(proxyUrl, entry.width, entry.height);
        const url = URL.createObjectURL(blob);
        setResults((prev) => ({ ...prev, [key]: url }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Crop failed");
        setTaskState("error");
      } finally {
        setProgress((prev) => ({ ...prev, [key]: true }));
      }
    };

    const generateEntries = outputSizes.filter((e): e is Extract<OutputEntry, { kind: "generate" }> => e.kind === "generate");
    const resizeEntries = outputSizes.filter((e): e is Extract<OutputEntry, { kind: "resize" }> => e.kind === "resize");
    const deriveEntries = outputSizes.filter((e): e is Extract<OutputEntry, { kind: "deriveFrom" }> => e.kind === "deriveFrom");

    await Promise.all([
      ...generateEntries.map((e) => runOne(e.image_size, getResultKey(e))),
      ...resizeEntries.map((e) => runResize(e)),
    ]);

    if (deriveEntries.length > 0) {
      await Promise.all(deriveEntries.map((e) => runDerive(e, resultUrls)));
    }

    setTaskState((prev) => (prev === "error" ? "error" : "success"));
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <Link
          href="/lab"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lab
        </Link>
      </div>

      <div className="mb-12">
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
          Lab
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          <ImageIcon className="h-8 w-8 sm:h-9 sm:w-9 text-accent" />
          Image Generator
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Game store covers from a 16:9 source cover. Select platforms — only the required formats are generated (Nano Banana).
        </p>
      </div>

      <Card className="border-border bg-card mb-10">
        <CardHeader>
          <CardTitle className="text-lg">Source</CardTitle>
          <CardDescription>
            Image URL. 16:9 cover for platform generation or icon for square resize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceType === "cover" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSourceType("cover");
                setError(null);
                setIconState((prev) => {
                  if (prev?.masterUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.masterUrl);
                  return null;
                });
              }}
            >
              Cover
            </Button>
            <Button
              type="button"
              variant={sourceType === "icon" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSourceType("icon");
                setError(null);
                setIconState((prev) => {
                  if (prev?.masterUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.masterUrl);
                  return null;
                });
              }}
            >
              Icon
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Image URL</label>
            <input
              type="url"
              placeholder="https://example.com/cover.jpg or https://example.com/icon.png"
              value={imageUrl}
              onChange={handleUrlChange}
              className="w-full max-w-md px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {sourceType === "cover" && (
            <div>
              <CardTitle className="text-base mb-2">Platforms</CardTitle>
              <CardDescription className="mb-3">
                Select platforms — only the required formats will be generated.
              </CardDescription>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map(({ id, name }) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-2 hover:bg-muted/50 has-[:checked]:border-ring has-[:checked]:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(id)}
                      onChange={() => togglePlatform(id)}
                      className="rounded border-border"
                    />
                    <span className="text-sm font-medium">{name}</span>
                  </label>
                ))}
              </div>
              {hasSelection && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Will generate:{" "}
                  {outputSizes
                    .map((s) =>
                      s.kind === "generate"
                        ? s.image_size
                        : s.kind === "resize"
                          ? `resize ${s.width}×${s.height}`
                          : `5:7 from 9:16`
                    )
                    .join(", ")}{" "}
                  — {outputSizes.flatMap((s) => s.platforms.map((p) => `${p.name} ${p.width}×${p.height}`)).join(", ")}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
              {debugInfo != null && Object.keys(debugInfo).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Debug: API response
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded border border-border bg-muted/50 p-3 text-left">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                  <p className="mt-1 text-muted-foreground">
                    Also check the browser console (F12 → Console) for [Image Generator] logs.
                  </p>
                </details>
              )}
            </div>
          )}

          {sourceType === "cover" && (
            <Button
              onClick={handleGenerate}
              disabled={
                taskState === "uploading" ||
                taskState === "generating" ||
                !hasSelection ||
                !imageUrl.trim()
              }
            >
              {(taskState === "uploading" || taskState === "generating") && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {taskState === "uploading"
                ? "Uploading…"
                : taskState === "generating"
                  ? "Generating…"
                  : "Generate covers"}
            </Button>
          )}

          {sourceType === "icon" && (
            <Button
              onClick={handleProcessIcon}
              disabled={iconLoading || !imageUrl.trim()}
            >
              {iconLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {iconLoading ? "Processing…" : "Scale to 1080×1080"}
            </Button>
          )}
        </CardContent>
      </Card>

      {sourceType === "icon" && iconState && (
        <Card className="border-border bg-card mb-10">
          <CardHeader>
            <CardTitle className="text-lg">Icon 1080×1080</CardTitle>
            <CardDescription>
              Download the size you need.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative w-48 h-48 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
                <Image
                  src={iconState.masterUrl}
                  alt="Icon 1080×1080"
                  width={192}
                  height={192}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {ICON_DOWNLOAD_SIZES.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadIconSize(size)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {size}×{size}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {sourceType === "cover" &&
        (outputSizes.some((s) => results[getResultKey(s)] || progress[getResultKey(s)]) || taskState === "generating") && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {outputSizes.map((entry) => {
            const key = getResultKey(entry);
            const resultUrl = results[key];
            const done = progress[key];
            const isResize = entry.kind === "resize";
            const isDerive = entry.kind === "deriveFrom";
            const title = isResize
              ? `Resize ${entry.width}×${entry.height}`
              : isDerive
                ? `5:7 (from 9:16)`
                : entry.image_size;
            const aspectClass = isResize
              ? "aspect-video"
              : isDerive
                ? "aspect-[5/7]"
                : ASPECT_CLASS[entry.image_size];
            const imgW = isResize ? 640 : isDerive ? 360 : entry.kind === "generate" && (entry.image_size === "9:16" || entry.image_size === "2:3" || entry.image_size === "3:4" || entry.image_size === "4:5") ? 360 : 640;
            const imgH = isResize ? 360 : isDerive ? 504 : entry.kind === "generate" && entry.image_size === "9:16" ? 640 : entry.kind === "generate" && (entry.image_size === "16:9" || entry.image_size === "21:9") ? 360 : 480;
            const label = `${title} — ${entry.platforms.map((p) => `${p.name} ${p.width}×${p.height}`).join(", ")}`;
            return (
              <Card key={key} className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-xs">
                    {entry.platforms.map((p) => `${p.name}: ${p.width}×${p.height}`).join(" · ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {resultUrl ? (
                    <div className="space-y-3">
                      <a
                        href={resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block relative rounded-lg border border-border overflow-hidden bg-muted ${aspectClass}`}
                      >
                        <Image
                          src={resultUrl}
                          alt={label}
                          width={imgW}
                          height={imgH}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      </a>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={resultUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                        >
                          <Download className="h-4 w-4" />
                          Download as-is
                        </a>
                        {entry.platforms.map((p) => (
                          <Button
                            key={`${p.name}-${p.width}-${p.height}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => openCropModal(resultUrl, p.width, p.height, `${p.name}-${p.width}x${p.height}`)}
                          >
                            <Crop className="h-3.5 w-3.5 mr-1.5" />
                            {p.name} {p.width}×{p.height}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : done && error ? (
                    <p className="text-sm text-muted-foreground">Error for this format</p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-8">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">{isResize ? "Resizing…" : isDerive ? "Cropping…" : "Generating…"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {cropModal && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h3 className="font-semibold text-foreground">
              Crop for {cropModal.targetWidth}×{cropModal.targetHeight}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setCropModal(null)}>
              Close
            </Button>
          </div>
          <div className="relative flex-1 min-h-0 w-full" style={{ minHeight: "400px" }}>
            <Cropper
              image={cropModal.imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={cropModal.targetWidth / cropModal.targetHeight}
              onCropChange={setCrop}
              onCropComplete={onCropChangeCallback}
              onCropAreaChange={onCropChangeCallback}
              onZoomChange={setZoom}
              style={{ containerStyle: { backgroundColor: "hsl(var(--muted))" } }}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border shrink-0">
            <Button onClick={handleCropDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download {cropModal.targetWidth}×{cropModal.targetHeight}
            </Button>
            <p className="text-sm text-muted-foreground">
              Position the crop area and click Download. The crop frame has a fixed aspect ratio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
