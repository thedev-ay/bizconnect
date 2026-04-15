"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Puzzle,
  Settings,
  LogOut,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenants", label: "Tenants", icon: Building2 },
  { href: "/modules", label: "Modules", icon: Puzzle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sticky top-0 hidden min-h-screen w-72 self-stretch flex-col border-r border-sidebar-border/80 bg-[linear-gradient(180deg,rgba(18,34,39,0.98)_0%,rgba(29,51,59,0.96)_100%)] text-sidebar-foreground shadow-[8px_0_32px_-24px_rgba(15,23,42,0.45)] lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="rounded-[calc(var(--radius)+2px)] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm shadow-[0_22px_40px_-28px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/95 to-cyan-200 shadow-[0_12px_24px_-14px_rgba(56,189,248,0.75)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/45">
                BizConnect
              </p>
              <p className="text-lg font-semibold tracking-[-0.03em] text-sidebar-foreground">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-foreground/40">
          Platform
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-slate-900 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.45)]"
                  : "text-sidebar-foreground/72 hover:bg-white/10 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-[calc(var(--radius)+2px)] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-sm">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-white/14 text-xs font-medium text-white">
              {initials ?? "SA"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-50">
              {session?.user?.name ?? "Super Admin"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50">
              {session?.user?.email ?? "admin@bizconnect.app"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-sidebar-foreground/55 hover:bg-white/10 hover:text-sidebar-foreground"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-44">
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
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
