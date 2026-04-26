"use client";

import { usePathname } from "next/navigation";
import { Menu, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopbarCtaLabel, fireTopbarCta } from "./topbar-cta-context";

type TopbarModule = { slug: string; name: string };

interface TopbarProps {
  tenant: { name: string; slug: string };
  modules: TopbarModule[];
  onOpenMobileNav: () => void;
  notificationSlot?: React.ReactNode;
}

const STATIC_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  settings: "Settings",
  reports: "Reports",
  users: "Users",
  sales: "Sales History",
};

function useBreadcrumb(modules: TopbarModule[]) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const moduleSlug = segments[1];
  if (!moduleSlug || moduleSlug === "dashboard") return null;
  const moduleMap = new Map(modules.map((m) => [m.slug, m.name]));
  return moduleMap.get(moduleSlug) ?? STATIC_NAMES[moduleSlug] ?? null;
}

export function Topbar({ tenant, modules, onOpenMobileNav, notificationSlot }: TopbarProps) {
  const breadcrumb = useBreadcrumb(modules);
  const ctaCtx = useTopbarCtaLabel();
  const ctaLabel = ctaCtx?.label ?? null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/75 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
        <span className="truncate font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          {tenant.name}
        </span>
        {breadcrumb && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            <span className="truncate font-medium text-foreground/80">{breadcrumb}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {ctaLabel && (
          <button
            type="button"
            onClick={fireTopbarCta}
            className="hidden items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:inline-flex"
          >
            <Plus className="h-3.5 w-3.5" />
            {ctaLabel}
          </button>
        )}
        {notificationSlot}
      </div>
    </header>
  );
}
