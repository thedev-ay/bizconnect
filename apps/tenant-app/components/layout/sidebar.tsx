"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import type { ActiveModule } from "@/lib/module-registry";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  tenant: { slug: string; name: string };
  modules: ActiveModule[];
}

const MODULE_GROUPS: { label: string; slugs: string[] }[] = [
  {
    label: "Main",
    slugs: ["dashboard", "users", "reports"],
  },
  {
    label: "Business",
    slugs: ["pos", "inventory", "appointments", "job-orders", "billing", "crm", "staff", "hr"],
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
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {name}
      </Link>
    );
  }

  // Dashboard is always available — inject it as a static item
  const dashboard = { id: "dashboard", slug: "dashboard", name: "Dashboard", icon: "LayoutDashboard", sortOrder: -1, isCore: true };
  const moduleBySlug = new Map([["dashboard", dashboard], ...modules.map((m) => [m.slug, m] as [string, typeof dashboard])]);

  // Determine which groups have at least one active module
  const groups = MODULE_GROUPS.map((group) => ({
    label: group.label,
    items: group.slugs
      .map((slug) => moduleBySlug.get(slug))
      .filter(Boolean) as typeof modules,
  })).filter((g) => g.items.length > 0);

  // Any active modules not in a defined group
  const groupedSlugs = new Set(MODULE_GROUPS.flatMap((g) => g.slugs));
  const ungrouped = modules.filter((m) => !groupedSlugs.has(m.slug));

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight">{tenant.name}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Grouped modules */}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.slug} slug={item.slug} name={item.name} icon={item.icon} />
              ))}
            </div>
          </div>
        ))}

        {/* Ungrouped fallback */}
        {ungrouped.length > 0 && (
          <div>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs font-medium">{initials ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.name ?? "User"}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {session?.user?.role ?? "member"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: `/${tenant.slug}/login` })}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
