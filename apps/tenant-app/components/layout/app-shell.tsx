"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";
import { TopbarCtaProvider, useTopbarCtaLabel, fireTopbarCta } from "@/components/layout/topbar-cta-context";

type ShellModule = {
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isCore: boolean;
};

type ShellBranch = {
  id: string;
  name: string;
  slug: string;
};

interface AppShellProps {
  tenant: { slug: string; name: string };
  modules: ShellModule[];
  branches: ShellBranch[];
  currentBranchId: string | null;
  children: React.ReactNode;
  notificationSlot?: React.ReactNode;
}

function MobileFab() {
  const ctx = useTopbarCtaLabel();
  if (!ctx?.label) return null;
  return (
    <button
      type="button"
      onClick={fireTopbarCta}
      aria-label={ctx.label}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_70%,transparent)] transition active:scale-95 sm:hidden"
    >
      <Plus className="h-6 w-6 text-primary-foreground" />
    </button>
  );
}

export function AppShell({
  tenant,
  modules,
  branches,
  currentBranchId,
  children,
  notificationSlot,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const paletteModules = [
    { slug: "dashboard", name: "Dashboard", icon: "LayoutDashboard" },
    ...modules.map((m) => ({ slug: m.slug, name: m.name, icon: m.icon })),
    { slug: "settings", name: "Settings", icon: "Settings" },
  ];

  return (
    <TopbarCtaProvider>
      <div className="flex h-screen flex-col overflow-hidden overscroll-none bg-transparent">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar
            tenant={tenant}
            modules={modules}
            branches={branches}
            currentBranchId={currentBranchId}
            mobileOpen={mobileNavOpen}
            onMobileOpenChange={setMobileNavOpen}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              tenant={tenant}
              modules={paletteModules}
              onOpenMobileNav={() => setMobileNavOpen(true)}
              notificationSlot={notificationSlot}
            />
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette tenantSlug={tenant.slug} modules={paletteModules} />
        <MobileFab />
        <RouteProgressBar />
      </div>
    </TopbarCtaProvider>
  );
}
