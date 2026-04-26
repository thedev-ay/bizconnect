"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import {
  ClipboardList,
  Package,
  ReceiptText,
  ShoppingCart,
  Calendar,
  Users,
  RotateCcw,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  ClipboardList,
  Package,
  ReceiptText,
  ShoppingCart,
  Calendar,
  Users,
  RotateCcw,
} as const;

type ToneKey = "blue" | "green" | "violet" | "amber" | "zinc";

const TONE: Record<ToneKey, { icon: string; glow: string }> = {
  blue: {
    icon: "bg-[color-mix(in_oklch,var(--info)_18%,transparent)] text-[color:var(--info)] ring-[color-mix(in_oklch,var(--info)_30%,transparent)]",
    glow: "hover:shadow-[0_24px_60px_-40px_color-mix(in_oklch,var(--info)_55%,transparent)]",
  },
  green: {
    icon: "bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[color:var(--success)] ring-[color-mix(in_oklch,var(--success)_30%,transparent)]",
    glow: "hover:shadow-[0_24px_60px_-40px_color-mix(in_oklch,var(--success)_55%,transparent)]",
  },
  violet: {
    icon: "bg-primary/15 text-primary ring-primary/25",
    glow: "hover:shadow-[0_24px_60px_-40px_color-mix(in_oklch,var(--primary)_55%,transparent)]",
  },
  amber: {
    icon: "bg-[color-mix(in_oklch,var(--warning)_20%,transparent)] text-[color:var(--warning)] ring-[color-mix(in_oklch,var(--warning)_30%,transparent)]",
    glow: "hover:shadow-[0_24px_60px_-40px_color-mix(in_oklch,var(--warning)_55%,transparent)]",
  },
  zinc: {
    icon: "bg-muted text-muted-foreground ring-border/70",
    glow: "hover:shadow-[0_24px_60px_-40px_rgba(15,23,42,0.25)]",
  },
};

function AnimatedValue({
  value,
  isCurrency,
  currencySymbol,
  currencyLocale,
}: {
  value: number;
  isCurrency?: boolean;
  currencySymbol?: string;
  currencyLocale?: string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 24, stiffness: 180 });
  const display = useTransform(spring, (v) => {
    if (isCurrency) {
      return `${currencySymbol ?? ""}${Math.round(v).toLocaleString(currencyLocale, { minimumFractionDigits: 0 })}`;
    }
    return String(Math.round(v));
  });

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span>{display}</motion.span>;
}

export interface DashboardStatCardData {
  label: string;
  rawValue: number;
  isCurrency?: boolean;
  currencySymbol?: string;
  currencyLocale?: string;
  sub?: string;
  iconKey: keyof typeof ICONS;
  href?: string;
  color: ToneKey;
  alert?: boolean;
  trendPercent?: number | null;
}

export function DashboardStatCards({
  cards,
  cols = 4,
  mobileCols = 1,
}: {
  cards: DashboardStatCardData[];
  cols?: 2 | 3 | 4;
  mobileCols?: 1 | 2;
}) {
  const mobileClass = mobileCols === 2 ? "grid-cols-2" : "grid-cols-1";
  const colsClass =
    cols === 2
      ? "sm:grid-cols-2 lg:grid-cols-2"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid gap-3 ${mobileClass} ${colsClass}`}>
      {cards.map((card, i) => {
        const tone = TONE[card.color];
        const Icon = ICONS[card.iconKey];
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.26, ease: "easeOut" }}
          >
            <Link
              href={card.href} // TODO: if no href, render a non-link card
              className={cn(
                "group block rounded-[calc(var(--radius)+4px)] border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-20px_rgba(15,23,42,0.15)] transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-primary/30",
                tone.glow,
                "focus-ring"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow-label truncate">{card.label}</p>
                  <p className="mt-2 text-[1.7rem] font-semibold leading-none tracking-[-0.04em] text-foreground tabular-nums">
                    <AnimatedValue
                      value={card.rawValue}
                      isCurrency={card.isCurrency}
                      currencySymbol={card.currencySymbol}
                      currencyLocale={card.currencyLocale}
                    />
                  </p>
                  <p className="mt-1.5 min-h-[1rem] truncate text-xs text-muted-foreground">
                    {card.sub ?? "\u00A0"}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-[1.04]",
                    tone.icon
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                {card.alert ? (
                  <span className="inline-flex items-center gap-1 text-[color:var(--warning)]">
                    <AlertTriangle className="h-3 w-3" /> Restock
                  </span>
                ) : card.trendPercent != null ? (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 font-medium tabular-nums",
                    card.trendPercent >= 0 ? "text-[color:var(--success)]" : "text-destructive"
                  )}>
                    {card.trendPercent >= 0
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    {card.trendPercent >= 0 ? "+" : ""}{card.trendPercent}% vs prior
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">View</span>
                )}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-primary" />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
