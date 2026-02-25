"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Cropper, { Area } from "react-easy-crop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Link2, Loader2, Download, ArrowLeft, Crop } from "lucide-react";

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

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml";

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
  | "21:9";

const PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook",
    sizes: [
      { width: 1920, height: 1080, image_size: "16:9" as const },
      { width: 1080, height: 1920, image_size: "9:16" as const },
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
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

function getOutputSizes(selectedPlatformIds: PlatformId[]) {
  const byRatio = new Map<
    ImageSize,
    { image_size: ImageSize; platforms: { name: string; width: number; height: number }[] }
  >();
  for (const id of selectedPlatformIds) {
    const platform = PLATFORMS.find((p) => p.id === id);
    if (!platform) continue;
    for (const { width, height, image_size } of platform.sizes) {
      const existing = byRatio.get(image_size);
      const entry = { name: platform.name, width, height };
      if (existing) {
        const isDup = existing.platforms.some((p) => p.name === entry.name && p.width === width && p.height === height);
        if (!isDup) existing.platforms.push(entry);
      } else {
        byRatio.set(image_size, { image_size, platforms: [entry] });
      }
    }
  }
  return Array.from(byRatio.values());
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
  "21:9": "aspect-[21/9]",
};

type TaskState = "idle" | "uploading" | "generating" | "success" | "error";

export default function ImageGeneratorPage() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const outputSizes = useMemo(() => getOutputSizes(selectedPlatforms), [selectedPlatforms]);
  const hasSelection = selectedPlatforms.length > 0;

  const togglePlatform = (id: PlatformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const onCropComplete = useCallback((_cropArea: Area, croppedAreaPixels: Area) => {
    cropAreaRef.current = croppedAreaPixels;
  }, []);

  const openCropModal = (imageUrl: string, width: number, height: number, label: string) => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    cropAreaRef.current = null;
    setCropModal({ imageUrl, targetWidth: width, targetHeight: height, label });
  };

  const handleCropDownload = useCallback(async () => {
    if (!cropModal || !cropAreaRef.current) return;
    try {
      const blob = await getCroppedImageBlob(
        cropModal.imageUrl,
        cropAreaRef.current,
        cropModal.targetWidth,
        cropModal.targetHeight
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cover-${cropModal.targetWidth}x${cropModal.targetHeight}-${cropModal.label.replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setCropModal(null);
    } catch (e) {
      console.error("[Image Generator] Crop export failed:", e);
    }
  }, [cropModal]);

  const resetPreview = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetPreview();
    setFile(null);
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPT.split(",").some((t) => t === f.type)) {
      setError("Format not supported. Use jpg, png, webp, avif or svg.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setError(null);
  };

  const getIconUrl = async (): Promise<string> => {
    if (mode === "url") {
      const url = imageUrl.trim();
      if (!url) throw new Error("Введите URL обложки.");
      const res = await fetch("/api/fetch-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить изображение по URL");
      return data.url;
    }
    if (!file) throw new Error("Загрузите файл или введите URL.");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload-icon", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
    return data.url;
  };

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
    for (const { image_size } of outputSizes) {
      initialResults[image_size] = null;
      initialProgress[image_size] = false;
    }
    setResults(initialResults);
    setProgress(initialProgress);

    const runOne = async (image_size: ImageSize) => {
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
          setResults((prev) => ({ ...prev, [image_size]: result.url }));
        } else {
          setDebugInfo((result.debug ?? null) as Record<string, unknown> | null);
          setError(result.errorMessage);
          setTaskState("error");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation error");
        setTaskState("error");
      } finally {
        setProgress((prev) => ({ ...prev, [image_size]: true }));
      }
    };

    await Promise.all(outputSizes.map(({ image_size }) => runOne(image_size)));
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
          Обложки для игровых площадок из исходной обложки 16:9. Выберите площадки — сгенерируются только нужные форматы (Nano Banana).
        </p>
      </div>

      <Card className="border-border bg-card mb-10">
        <CardHeader>
          <CardTitle className="text-lg">Исходная обложка 16:9</CardTitle>
          <CardDescription>
            Ссылка или файл обложки в формате 16:9. JPG, PNG, WebP, AVIF или SVG.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("file");
                setError(null);
                setImageUrl("");
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              File
            </Button>
            <Button
              type="button"
              variant={mode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("url");
                setError(null);
                setFile(null);
                resetPreview();
              }}
            >
              <Link2 className="h-4 w-4 mr-2" />
              URL
            </Button>
          </div>

          {mode === "file" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0"
                >
                  Choose file
                </Button>
                {previewUrl && (
                  <div className="relative w-40 aspect-video rounded-lg border border-border overflow-hidden bg-muted">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={160}
                      height={90}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </div>
                )}
                {file && (
                  <p className="text-sm text-muted-foreground">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === "url" && (
            <input
              type="url"
              placeholder="https://example.com/cover-16x9.jpg"
              value={imageUrl}
              onChange={handleUrlChange}
              className="w-full max-w-md px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}

          <div>
            <CardTitle className="text-base mb-2">Площадки</CardTitle>
            <CardDescription className="mb-3">
              Выберите площадки — будут сгенерированы только нужные размеры.
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
                Будет сгенерировано: {outputSizes.map((s) => s.image_size).join(", ")} — для{" "}
                {outputSizes.flatMap((s) => s.platforms.map((p) => `${p.name} ${p.width}×${p.height}`)).join(", ")}
              </p>
            )}
          </div>

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
              {debugInfo != null && Object.keys(debugInfo).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Debug: ответ API
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded border border-border bg-muted/50 p-3 text-left">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                  <p className="mt-1 text-muted-foreground">
                    Также смотри консоль браузера (F12 → Console) для логов [Image Generator].
                  </p>
                </details>
              )}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={
              taskState === "uploading" ||
              taskState === "generating" ||
              !hasSelection ||
              (mode === "file" ? !file : !imageUrl.trim())
            }
          >
            {(taskState === "uploading" || taskState === "generating") && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {taskState === "uploading"
              ? "Загрузка…"
              : taskState === "generating"
                ? "Генерация…"
                : "Сгенерировать обложки"}
          </Button>
        </CardContent>
      </Card>

      {(outputSizes.some((s) => results[s.image_size] || progress[s.image_size]) || taskState === "generating") && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {outputSizes.map(({ image_size, platforms }) => {
            const resultUrl = results[image_size];
            const done = progress[image_size];
            const label = `${image_size} — ${platforms.map((p) => `${p.name} ${p.width}×${p.height}`).join(", ")}`;
            return (
              <Card key={image_size} className="border-border bg-card overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{image_size}</CardTitle>
                  <CardDescription className="text-xs">
                    {platforms.map((p) => `${p.name}: ${p.width}×${p.height}`).join(" · ")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {resultUrl ? (
                    <div className="space-y-3">
                      <a
                        href={resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block relative rounded-lg border border-border overflow-hidden bg-muted ${ASPECT_CLASS[image_size]}`}
                      >
                        <Image
                          src={resultUrl}
                          alt={label}
                          width={image_size === "9:16" || image_size === "2:3" || image_size === "3:4" || image_size === "4:5" ? 360 : 640}
                          height={image_size === "9:16" ? 640 : image_size === "16:9" || image_size === "21:9" ? 360 : 480}
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
                          Скачать как есть
                        </a>
                        {platforms.map((p) => (
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
                    <p className="text-sm text-muted-foreground">Ошибка для этого формата</p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-8">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Генерация…</span>
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
              Кроп под {cropModal.targetWidth}×{cropModal.targetHeight}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setCropModal(null)}>
              Закрыть
            </Button>
          </div>
          <div className="relative flex-1 min-h-0 w-full" style={{ minHeight: "400px" }}>
            <Cropper
              image={cropModal.imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={cropModal.targetWidth / cropModal.targetHeight}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              style={{ containerStyle: { backgroundColor: "hsl(var(--muted))" } }}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 border-t border-border shrink-0">
            <Button onClick={handleCropDownload}>
              <Download className="h-4 w-4 mr-2" />
              Скачать {cropModal.targetWidth}×{cropModal.targetHeight}
            </Button>
            <p className="text-sm text-muted-foreground">
              Выберите область и нажмите «Скачать». Соотношение рамки фиксировано.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
