import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ImageIcon, Wrench, LogOut } from "lucide-react";

const comingSoonTools = [
  {
    title: "AI Chat",
    description: "Interface for conversational AI — chat with models, compare responses, export threads.",
    icon: MessageSquare,
    href: null as string | null,
  },
  {
    title: "Image Generator",
    description: "Generate game covers from a 800×800 icon. Output: 1920×1080 and 1080×1920 (Nano Banana).",
    icon: ImageIcon,
    href: "/lab/image-generator",
  },
  {
    title: "More tools",
    description: "Utilities and experiments will appear here as they’re built.",
    icon: Wrench,
    href: null as string | null,
  },
] as const;

export const metadata = {
  title: "Lab — polovinka.work",
  description: "Tools and experiments: AI chat, image generation, and more.",
};

export default function LabPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="mb-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
        <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-2">
          Tools & experiments
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Lab
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Small tools and prototypes — AI chat, image generation, and other experiments. New items
          will show up here as they’re ready.
        </p>
        </div>
        <form action="/api/auth/lab/logout" method="POST">
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {comingSoonTools.map(({ title, description, icon: Icon, href }) => {
          const card = (
            <Card
              key={title}
              className="group border-border bg-card transition-colors hover:border-foreground/20 hover:bg-muted/30"
            >
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground group-hover:border-foreground/20 group-hover:text-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-medium mt-3">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {description}
                </CardDescription>
                {href ? (
                  <Link
                    href={href}
                    className="mt-3 inline-block text-xs font-medium uppercase tracking-wider text-accent hover:underline"
                  >
                    Open →
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Coming soon
                  </p>
                )}
              </CardContent>
            </Card>
          );
          return href ? (
            <Link key={title} href={href} className="block h-full">
              {card}
            </Link>
          ) : (
            card
          );
        })}
      </div>

      <div className="mt-16 rounded-xl border border-dashed border-border bg-muted/20 p-8 sm:p-12 text-center">
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This page is a placeholder for future tools. Add AI chat, image generator, or other
          utilities by creating new routes and linking them from here.
        </p>
      </div>
    </div>
  );
}
