"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopbarCtaLabel, fireTopbarCta, fireTopbarSecondaryCta } from "./topbar-cta-context";

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

function getReportsHref(pathname: string, tenantSlug: string) {
  const segments = pathname.split("/").filter(Boolean);
  const moduleSlug = segments[1];

  if (moduleSlug === "sales" || moduleSlug === "pos") {
    return `/${tenantSlug}/reports?section=sales`;
  }

  if (moduleSlug === "billing") {
    return `/${tenantSlug}/reports?section=payments`;
  }

  return `/${tenantSlug}/reports?section=overview`;
}

function shouldShowReportsLink(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const moduleSlug = segments[1] ?? "dashboard";

  return new Set([
    "dashboard",
    "inventory",
    "job-orders",
    "sales",
    "pos",
    "billing",
    "reports",
  ]).has(moduleSlug);
}

export function Topbar({ tenant, modules, onOpenMobileNav, notificationSlot }: TopbarProps) {
  const pathname = usePathname();
  const fallbackTitle = useBreadcrumb(modules) ?? "Dashboard";
  const ctaCtx = useTopbarCtaLabel();
  const ctaLabel = ctaCtx?.label ?? null;
  const secondaryCtaLabel = ctaCtx?.secondaryLabel ?? null;
  const pageTitle = ctaCtx?.page.title ?? fallbackTitle;
  const pageDescription = ctaCtx?.page.description ?? null;
  const hasPageDescription = Boolean(pageDescription);
  const reportsHref = getReportsHref(pathname, tenant.slug);
  const showReportsLink = shouldShowReportsLink(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-5 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.2rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.45rem]">
            {pageTitle}
          </h1>
          {hasPageDescription ? (
            <p className="mt-0.5 hidden truncate text-sm text-muted-foreground md:block">
              {pageDescription}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {secondaryCtaLabel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fireTopbarSecondaryCta}
              className="hidden rounded-full px-3.5 sm:inline-flex"
            >
              {secondaryCtaLabel}
            </Button>
          ) : null}
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
          {showReportsLink ? (
            <Link
              href={reportsHref}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground"
              aria-label="Open reports"
              title="Open reports"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          {notificationSlot}
        </div>
      </div>
      {hasPageDescription ? (
        <div className="border-t border-border/50 px-3 py-2 text-sm text-muted-foreground md:hidden sm:px-5 lg:px-6">
          <p className="truncate">{pageDescription}</p>
        </div>
      ) : null}
    </header>
  );
}
