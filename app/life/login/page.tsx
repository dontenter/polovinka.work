"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LifeLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = searchParams.get("from") ?? "/life";
  const redirect = /^\/(life)(\/|$)/.test(from) && !/[\\\r\n]/.test(from) ? from : "/life";
  const area = "Life";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl">{area} access</CardTitle>
          <CardDescription>
            Enter your separate Life password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                autoFocus
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

export default function LifeLoginPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-md mx-auto px-4 py-16">
        <div className="h-64 rounded-xl border border-border bg-muted/20 animate-pulse" />
      </div>
    }>
      <LifeLoginForm />
    </Suspense>
  );
}
