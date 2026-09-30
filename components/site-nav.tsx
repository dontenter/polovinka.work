"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/lab", label: "Lab" },
  { href: "/life", label: "Life" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      {navItems.map(({ href, label }) => {
        // On login page, "Lab" must not link to /lab (causes redirect and requires second click to submit)
        const isLabLogin = pathname === "/lab/login" && href === "/lab";
        const navHref = isLabLogin ? "/lab/login" : href;
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={navHref}
            className={cn(
              "transition-colors hover:text-foreground",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
