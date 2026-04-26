"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, MoreHorizontal, Check, GitBranch, Loader2 } from "lucide-react";
import { isPrivilegedRole, canViewModule } from "@/lib/permissions";
import { PendingSalesBadge } from "./pending-sales-badge";
import { switchBranch } from "@/modules/branches/actions";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SidebarModule = {
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isCore: boolean;
};

type SidebarBranch = {
  id: string;
  name: string;
  slug: string;
};

interface SidebarProps {
  tenant: { slug: string; name: string };
  modules: SidebarModule[];
  branches: SidebarBranch[];
  currentBranchId: string | null;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

const MODULE_GROUPS: { label: string; slugs: string[] }[] = [
  {
    label: "Main",
    slugs: ["dashboard", "users", "reports", "settings"],
  },
  {
    label: "Business",
    slugs: [
      "pos",
      "inventory",
      "job-orders",
      "services",
      "sales",
      "promotions",
      "loyalty",
      "appointments",
      "billing",
      "crm",
      "hr",
    ],
  },
];

export function Sidebar({
  tenant,
  modules,
  branches,
  currentBranchId,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    reports: pathname === `/${tenant.slug}/reports`,
    settings: pathname === `/${tenant.slug}/settings`,
  });

  useEffect(() => {
    setOpenGroups((current) => ({
      ...current,
      reports: pathname === `/${tenant.slug}/reports` ? true : current.reports,
      settings: pathname === `/${tenant.slug}/settings` ? true : current.settings,
    }));
  }, [pathname, tenant.slug]);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function getIcon(iconName: string | null): LucideIcon | null {
    if (!iconName) return null;
    return (Icons as Record<string, unknown>)[iconName] as LucideIcon | null;
  }

  function NavItem({
    slug,
    name,
    icon,
    onNavigate,
  }: {
    slug: string;
    name: string;
    icon?: string | null;
    onNavigate?: () => void;
  }) {
    const href = `/${tenant.slug}/${slug}`;
    const isActive = pathname === href || pathname.startsWith(href + "/");
    const Icon = getIcon(icon ?? null);

    return (
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
        onClick={onNavigate}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive
                ? "text-primary"
                : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground"
            )}
          />
        )}
        <span className="flex-1">{name}</span>
        {slug === "sales" && session?.user?.tenantId && (
          <PendingSalesBadge tenantId={session.user.tenantId} />
        )}
      </Link>
    );
  }

  function NavItemWithChildren({
    slug,
    name,
    icon,
    children,
    onNavigate,
  }: {
    slug: string;
    name: string;
    icon?: string | null;
    children: Array<{ label: string; href: string; isActive?: boolean }>;
    onNavigate?: () => void;
  }) {
    const href = `/${tenant.slug}/${slug}`;
    const isActive = pathname === href || pathname.startsWith(href + "/");
    const Icon = getIcon(icon ?? null);
    const isOpen = openGroups[slug] ?? false;

    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            if (isOpen && isActive) {
              setOpenGroups((current) => ({ ...current, [slug]: false }));
              return;
            }
            setOpenGroups((current) => ({ ...current, [slug]: true }));
            const firstChild = children[0];
            if (firstChild) {
              router.push(firstChild.href);
              onNavigate?.();
            }
          }}
          className={cn(
            "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
          )}
          {Icon && (
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground"
              )}
            />
          )}
          <span className="flex-1 text-left">{name}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/45 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div className="ml-7 space-y-0.5 border-l border-sidebar-border pl-3">
            {children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-xs transition-colors",
                  child.isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const dashboard = {
    id: "dashboard",
    slug: "dashboard",
    name: "Dashboard",
    icon: "LayoutDashboard",
    sortOrder: -1,
    isCore: true,
  };
  const settings = {
    id: "settings",
    slug: "settings",
    name: "Settings",
    icon: "Settings",
    sortOrder: 999,
    isCore: true,
  };
  const salesModule = {
    id: "sales",
    slug: "sales",
    name: "Sales History",
    icon: "ReceiptText",
    sortOrder: 5,
    isCore: false,
  };
  const moduleBySlug = new Map([
    ["dashboard", dashboard],
    ["settings", settings],
    ["sales", salesModule],
    ...modules.map((m) => [m.slug, m] as [string, typeof dashboard]),
  ]);

  const role = session?.user?.role ?? "member";
  const permissions = ((session?.user as any)?.permissions as Record<string, boolean>) ?? {};
  const privileged = isPrivilegedRole(role);

  const moduleSlugSet = new Set(modules.map((m) => m.slug));
  const salesEnabled = moduleSlugSet.has("pos") || moduleSlugSet.has("job-orders");

  function canSeeModule(slug: string): boolean {
    if (slug === "dashboard" || slug === "settings") return true;
    if (slug === "sales") return salesEnabled;
    if (privileged) return true;
    return canViewModule(permissions, slug);
  }

  const groups = MODULE_GROUPS.map((group) => ({
    label: group.label,
    items: group.slugs
      .map((slug) => moduleBySlug.get(slug))
      .filter((m): m is NonNullable<typeof m> => !!m && canSeeModule(m.slug)),
  })).filter((g) => g.items.length > 0);

  const groupedSlugs = new Set(MODULE_GROUPS.flatMap((g) => g.slugs));
  const ungrouped = modules.filter(
    (m) => !groupedSlugs.has(m.slug) && canSeeModule(m.slug)
  );
  const reportsSection = searchParams.get("section");
  const settingsTab = searchParams.get("tab") ?? "general";
  const hasPos = modules.some((m) => m.slug === "pos");
  const hasBilling = modules.some((m) => m.slug === "billing");

  const reportsChildren = [
    {
      label: "Overview",
      href: `/${tenant.slug}/reports?section=overview`,
      isActive:
        pathname === `/${tenant.slug}/reports` &&
        (reportsSection === "overview" || reportsSection === null),
    },
    hasPos && {
      label: "Sales",
      href: `/${tenant.slug}/reports?section=sales`,
      isActive: pathname === `/${tenant.slug}/reports` && reportsSection === "sales",
    },
    (hasPos || hasBilling) && {
      label: "Payments",
      href: `/${tenant.slug}/reports?section=payments`,
      isActive: pathname === `/${tenant.slug}/reports` && reportsSection === "payments",
    },
  ].filter(Boolean) as { label: string; href: string; isActive: boolean }[];

  const settingsChildren = [
    {
      label: "General",
      href: `/${tenant.slug}/settings?tab=general`,
      isActive: pathname === `/${tenant.slug}/settings` && settingsTab === "general",
    },
    {
      label: "Business Hours",
      href: `/${tenant.slug}/settings?tab=hours`,
      isActive: pathname === `/${tenant.slug}/settings` && settingsTab === "hours",
    },
  ].filter(Boolean) as { label: string; href: string; isActive: boolean }[];

  function WorkspacePill() {
    const [isPending, startTransition] = useTransition();
    const currentBranch = branches.find((b) => b.id === currentBranchId);

    if (branches.length <= 1) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-cyan-300/70 shadow-[0_8px_20px_-12px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            <Icons.Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
              BizConnect
            </p>
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">
              {tenant.name}
            </span>
          </div>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          }
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-cyan-300/70 shadow-[0_8px_20px_-12px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
            ) : (
              <Icons.Zap className="h-4 w-4 text-primary-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/55">
              BizConnect
            </p>
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">
              {tenant.name}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-sidebar-foreground/55">
              <GitBranch className="h-3 w-3 shrink-0" />
              <span className="truncate">{currentBranch?.name ?? "Select branch"}</span>
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="start" className="w-56">
          {branches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              className="gap-2"
              onClick={() => {
                if (branch.id === currentBranchId) return;
                startTransition(async () => {
                  await switchBranch(tenant.slug, branch.id);
                  router.refresh();
                });
              }}
            >
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{branch.name}</span>
              {branch.id === currentBranchId && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <div className="border-b border-sidebar-border px-3 pb-3 pt-4">
          <WorkspacePill />
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/35">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) =>
                  item.slug === "reports" ? (
                    <NavItemWithChildren
                      key={item.slug}
                      slug={item.slug}
                      name={item.name}
                      icon={item.icon}
                      children={reportsChildren}
                      onNavigate={onNavigate}
                    />
                  ) : item.slug === "settings" ? (
                    <NavItemWithChildren
                      key={item.slug}
                      slug={item.slug}
                      name={item.name}
                      icon={item.icon}
                      children={settingsChildren}
                      onNavigate={onNavigate}
                    />
                  ) : (
                    <NavItem
                      key={item.slug}
                      slug={item.slug}
                      name={item.name}
                      icon={item.icon}
                      onNavigate={onNavigate}
                    />
                  )
                )}
              </div>
            </div>
          ))}

          {ungrouped.length > 0 && (
            <div>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/35">
                Other
              </p>
              <div className="space-y-0.5">
                {ungrouped.map((item) => (
                  <NavItem
                    key={item.slug}
                    slug={item.slug}
                    name={item.name}
                    icon={item.icon}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
                {initials ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {session?.user?.name ?? "User"}
              </p>
              <p className="truncate text-[11px] capitalize text-sidebar-foreground/55">
                {session?.user?.role ?? "member"}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-full text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  />
                }
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-44">
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={async () => {
                    await signOut({ redirect: false });
                    window.location.href = `/${tenant.slug}/login`;
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-full max-w-none border-r-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-sm lg:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarBody onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <aside
        className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
      >
        <SidebarBody />
      </aside>
    </>
  );
}
