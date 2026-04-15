"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck } from "lucide-react";

const TITLES: Record<string, string> = {
  "/dashboard": "Platform Overview",
  "/tenants": "Tenants",
  "/modules": "Modules",
  "/settings": "Settings",
};

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/70 bg-white/88 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3 lg:opacity-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:hidden">
          <ShieldCheck className="h-4.5 w-4.5" />
        </div>
        <div className="lg:hidden">
          <p className="admin-eyebrow">Platform</p>
          <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">
            {Object.entries(TITLES).find(([key]) => pathname === key || pathname.startsWith(`${key}/`))?.[1] ?? "Control Room"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials ?? "SA"}</AvatarFallback>
        </Avatar>
        <div className="hidden sm:block">
          <p className="text-sm font-medium">{session?.user?.name ?? "Super Admin"}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
        </div>
      </div>
    </header>
  );
}
