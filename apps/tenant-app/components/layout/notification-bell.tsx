"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  label: string;
  count: number;
  href: string;
}

interface NotificationBellProps {
  items: NotificationItem[];
  tenantSlug?: string;
}

const POLL_INTERVAL = 60_000;

export function NotificationBell({ items: initialItems, tenantSlug }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;

    async function refresh() {
      try {
        const res = await fetch(`/api/${tenantSlug}/notifications`);
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.items);
      } catch {
        // silently ignore polling failures
      }
    }

    intervalRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tenantSlug]);

  const total = items.reduce((sum, i) => sum + i.count, 0);

  if (total === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground",
          open && "border-border bg-card text-foreground"
        )}
        aria-label={`${total} items need attention`}
      >
        <Bell className="h-3.5 w-3.5" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold leading-none text-destructive-foreground tabular-nums">
          {total > 9 ? "9+" : total}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border/70 bg-popover shadow-[0_8px_32px_-8px_rgba(15,23,42,0.2)] animate-in fade-in-0 zoom-in-95">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Needs attention
              </p>
            </div>
            <div className="divide-y divide-border/50 py-1">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-muted/50"
                >
                  <span className="text-foreground/90">{item.label}</span>
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-destructive">
                    {item.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
