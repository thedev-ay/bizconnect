"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogOut, MoreHorizontal } from "lucide-react";
import type { ActiveModule } from "@/lib/module-registry";
import { isPrivilegedRole, canViewModule } from "@/lib/permissions";
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

interface SidebarProps {
  tenant: { slug: string; name: string };
  modules: ActiveModule[];
}

const MODULE_GROUPS: { label: string; slugs: string[] }[] = [
  {
    label: "Main",
    slugs: ["dashboard", "users", "reports", "settings"],
  },
  {
    label: "Business",
    slugs: ["pos", "inventory", "services", "promotions", "appointments", "job-orders", "loyalty", "billing", "crm", "hr"],
  },
];

export function Sidebar({ tenant, modules }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

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

  function NavItem({ slug, name, icon }: { slug: string; name: string; icon?: string | null }) {
    const href = `/${tenant.slug}/${slug}`;
    const isActive = pathname === href || pathname.startsWith(href + "/");
    const Icon = getIcon(icon ?? null);

    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-white/10 text-white font-medium"
            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {name}
      </Link>
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
  const moduleBySlug = new Map([
    ["dashboard", dashboard],
    ["settings", settings],
    ...modules.map((m) => [m.slug, m] as [string, typeof dashboard]),
  ]);

  const role = session?.user?.role ?? "member";
  const permissions = (session?.user as any)?.permissions as Record<string, boolean> ?? {};
  const privileged = isPrivilegedRole(role);

  function canSeeModule(slug: string): boolean {
    // Always show core items for everyone
    if (slug === "dashboard" || slug === "settings") return true;
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
  const ungrouped = modules.filter((m) => !groupedSlugs.has(m.slug) && canSeeModule(m.slug));

  return (
    <aside className="flex h-full w-60 flex-col bg-zinc-950">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-white/5">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10">
          <Icons.Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-white truncate">{tenant.name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.slug} slug={item.slug} name={item.name} icon={item.icon} />
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Other
            </p>
            <div className="space-y-0.5">
              {ungrouped.map((item) => (
                <NavItem key={item.slug} slug={item.slug} name={item.name} icon={item.icon} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-white/10 text-white text-xs font-medium">
              {initials ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {session?.user?.name ?? "User"}
            </p>
            <p className="truncate text-xs capitalize text-zinc-500">
              {session?.user?.role ?? "member"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-zinc-500 hover:text-zinc-100 hover:bg-white/5"
              />
            }>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-44">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive gap-2"
                onClick={() => signOut({ callbackUrl: `/${tenant.slug}/login` })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
