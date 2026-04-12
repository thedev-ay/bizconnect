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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const COLOR_MAP = {
  blue: {
    bg: "bg-sky-100/80",
    text: "text-sky-700",
    ring: "ring-sky-200/70",
    accent: "from-sky-500/12 to-sky-100/0",
  },
  green: {
    bg: "bg-emerald-100/80",
    text: "text-emerald-700",
    ring: "ring-emerald-200/70",
    accent: "from-emerald-500/12 to-emerald-100/0",
  },
  violet: {
    bg: "bg-cyan-100/80",
    text: "text-cyan-700",
    ring: "ring-cyan-200/70",
    accent: "from-cyan-500/12 to-cyan-100/0",
  },
  amber: {
    bg: "bg-amber-100/80",
    text: "text-amber-700",
    ring: "ring-amber-200/70",
    accent: "from-amber-500/12 to-amber-100/0",
  },
  zinc: {
    bg: "bg-slate-100/85",
    text: "text-slate-600",
    ring: "ring-slate-200/70",
    accent: "from-slate-500/10 to-slate-100/0",
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
  const spring = useSpring(mv, { damping: 22, stiffness: 180 });
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
  href: string;
  color: keyof typeof COLOR_MAP;
  alert?: boolean;
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
    cols === 2 ? "sm:grid-cols-2 lg:grid-cols-2"
    : cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3"
    : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-4 ${mobileClass} ${colsClass}`}>
      {cards.map((card, i) => {
        const c = COLOR_MAP[card.color];
        const Icon = ICONS[card.iconKey];
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.055, duration: 0.28, ease: "easeOut" }}
          >
            <Link href={card.href}>
              <Card className="cursor-pointer border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_50px_-34px_rgba(13,148,136,0.35)]">
                <CardContent className="flex h-full min-h-[132px] flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-h-[84px] flex-1 flex-col">
                      <p className="eyebrow-label min-h-[1.75rem] text-[0.68rem] leading-[1.15]">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                        <AnimatedValue
                          value={card.rawValue}
                          isCurrency={card.isCurrency}
                          currencySymbol={card.currencySymbol}
                          currencyLocale={card.currencyLocale}
                        />
                      </p>
                      <p className="mt-1 min-h-[1.25rem] text-xs text-muted-foreground">
                        {card.sub ?? "\u00A0"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl ring-1 backdrop-blur-sm",
                        c.bg,
                        c.ring
                      )}
                    >
                      <Icon className={`h-4.5 w-4.5 ${c.text}`} />
                    </div>
                  </div>
                  <div className={cn("mt-4 h-px w-full bg-gradient-to-r", c.accent)} />
                  {card.alert && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Restock
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
