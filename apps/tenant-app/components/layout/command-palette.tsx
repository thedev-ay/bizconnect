"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogOut, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type PaletteModule = {
  slug: string;
  name: string;
  icon: string | null;
};

interface CommandPaletteProps {
  tenantSlug: string;
  modules: PaletteModule[];
}

const GROUP_ORDER = ["Main", "Business", "Account"];

const MAIN_SLUGS = new Set(["dashboard", "users", "reports", "settings", "sales"]);

function getIcon(iconName: string | null): LucideIcon | null {
  if (!iconName) return null;
  return (Icons as Record<string, unknown>)[iconName] as LucideIcon | null;
}

export function CommandPalette({ tenantSlug, modules }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runCommand = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const navItems = useMemo(() => {
    return modules.map((module) => {
      const group = MAIN_SLUGS.has(module.slug) ? "Main" : "Business";
      return {
        id: module.slug,
        name: module.name,
        icon: module.icon,
        href: `/${tenantSlug}/${module.slug}`,
        group,
      };
    });
  }, [modules, tenantSlug]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof navItems>();
    for (const item of navItems) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return map;
  }, [navItems]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="palette"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="fixed left-1/2 top-[15vh] z-[101] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2"
            role="dialog"
            aria-modal="true"
          >
            <Command
              label="Global command menu"
              className="overflow-hidden rounded-2xl border border-border/60 bg-popover/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search modules, actions, settings…"
                  className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
                />
                <kbd className="kbd">ESC</kbd>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{search}&rdquo;
                </Command.Empty>

                {GROUP_ORDER.filter((group) =>
                  group === "Account" ? true : grouped.has(group)
                ).map((group) => {
                  if (group === "Account") {
                    return (
                      <PaletteGroup key={group} heading="Account">
                        <PaletteItem
                          onSelect={() =>
                            runCommand(async () => {
                              await signOut({ redirect: false });
                              window.location.href = `/${tenantSlug}/login`;
                            })
                          }
                          icon={LogOut}
                          label="Sign out"
                          destructive
                          keywords="logout exit"
                        />
                      </PaletteGroup>
                    );
                  }
                  const items = grouped.get(group);
                  if (!items?.length) return null;
                  return (
                    <PaletteGroup key={group} heading={group}>
                      {items.map((item) => {
                        const Icon = getIcon(item.icon);
                        return (
                          <PaletteItem
                            key={item.id}
                            onSelect={() => runCommand(() => router.push(item.href))}
                            icon={Icon ?? Icons.Circle}
                            label={item.name}
                            keywords={item.name.toLowerCase()}
                          />
                        );
                      })}
                    </PaletteGroup>
                  );
                })}
              </Command.List>

              <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <kbd className="kbd">↑</kbd>
                  <kbd className="kbd">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="kbd">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="kbd">⌘</kbd>
                  <kbd className="kbd">K</kbd>
                  toggle
                </span>
              </div>
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PaletteGroup({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
    >
      {children}
    </Command.Group>
  );
}

function PaletteItem({
  onSelect,
  icon: Icon,
  label,
  keywords,
  destructive,
}: {
  onSelect: () => void;
  icon: LucideIcon;
  label: string;
  keywords?: string;
  destructive?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={`${label} ${keywords ?? ""}`}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors",
        "data-[selected=true]:bg-accent/80 data-[selected=true]:text-accent-foreground",
        destructive &&
          "text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <span className="flex-1">{label}</span>
    </Command.Item>
  );
}

export function CommandPaletteTrigger({ className }: { className?: string }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      }}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 text-sm text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground focus-ring",
        className
      )}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="pr-12 text-xs">Search…</span>
      <span className="ml-auto flex items-center gap-1">
        <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
        <kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}
