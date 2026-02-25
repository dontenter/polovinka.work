"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Link2, Loader2, Download, ArrowLeft } from "lucide-react";

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml";
const SIZES = [
  { label: "1920×1080 (landscape)", image_size: "16:9" as const },
  { label: "1080×1920 (portrait)", image_size: "9:16" as const },
] as const;

type TaskState = "idle" | "uploading" | "generating" | "success" | "error";

export default function ImageGeneratorPage() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<TaskState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ "16:9": string | null; "9:16": string | null }>({
    "16:9": null,
    "9:16": null,
  });
  const [progress, setProgress] = useState<{ "16:9": boolean; "9:16": boolean }>({
    "16:9": false,
    "9:16": false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setError(null);
  };

  const getIconUrl = async (): Promise<string> => {
    if (mode === "url") {
      const url = imageUrl.trim();
      if (!url) throw new Error("Enter icon URL.");
      return url;
    }
    if (!file) throw new Error("Upload a file or enter a URL.");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload-icon", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload error");
    return data.url;
  };

  const pollTask = async (taskId: string): Promise<string | null> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`/api/generate-cover/status?taskId=${encodeURIComponent(taskId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status error");
      if (data.status === "success" && data.resultImageUrl) return data.resultImageUrl;
      if (data.status === "failed") throw new Error(data.errorMessage || "Generation failed");
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Result timeout");
  };

  const handleGenerate = async () => {
    setError(null);
    setTaskState("uploading");
    let iconUrl: string;
    try {
      iconUrl = await getIconUrl();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setTaskState("error");
      return;
    }

    setTaskState("generating");
    setResults({ "16:9": null, "9:16": null });
    setProgress({ "16:9": false, "9:16": false });

    const runOne = async (image_size: "16:9" | "9:16") => {
      try {
        const res = await fetch("/api/generate-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ iconUrl, image_size }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request error");
        const taskId = data.taskId;
        const resultUrl = await pollTask(taskId);
        setResults((prev) => ({ ...prev, [image_size]: resultUrl }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation error");
        setTaskState("error");
      } finally {
        setProgress((prev) => ({ ...prev, [image_size]: true }));
      }
    };

    await Promise.all([runOne("16:9"), runOne("9:16")]);

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
          Generate game covers from an 800×800 icon. Output: 1920×1080 and 1080×1920 covers
          (Nano Banana).
        </p>
      </div>

      <Card className="border-border bg-card mb-10">
        <CardHeader>
          <CardTitle className="text-lg">Game icon (800×800)</CardTitle>
          <CardDescription>
            JPG, JPEG, PNG, WebP, AVIF or SVG. Upload a file or paste a public URL.
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
                  <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden bg-muted">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={96}
                      height={96}
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
              placeholder="https://example.com/game-icon.png"
              value={imageUrl}
              onChange={handleUrlChange}
              className="w-full max-w-md px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            onClick={handleGenerate}
            disabled={
              taskState === "uploading" ||
              taskState === "generating" ||
              (mode === "file" ? !file : !imageUrl.trim())
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
        </CardContent>
      </Card>

      {(results["16:9"] || results["9:16"] || taskState === "generating") && (
        <div className="grid gap-6 sm:grid-cols-2">
          {SIZES.map(({ label, image_size }) => (
            <Card key={image_size} className="border-border bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                {results[image_size] ? (
                  <div className="space-y-3">
                    <a
                      href={results[image_size]!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-video sm:aspect-[16/9] rounded-lg border border-border overflow-hidden bg-muted"
                    >
                      <Image
                        src={results[image_size]!}
                        alt={label}
                        width={640}
                        height={360}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </a>
                    <a
                      href={results[image_size]!}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                ) : progress[image_size] && error ? (
                  <p className="text-sm text-muted-foreground">Error for this size</p>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Generating…</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
