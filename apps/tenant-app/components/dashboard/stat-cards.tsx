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
  blue:   { bg: "bg-blue-50",    text: "text-blue-600" },
  green:  { bg: "bg-emerald-50", text: "text-emerald-600" },
  violet: { bg: "bg-violet-50",  text: "text-violet-600" },
  amber:  { bg: "bg-amber-50",   text: "text-amber-600" },
  zinc:   { bg: "bg-zinc-100",   text: "text-zinc-500" },
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

export function DashboardStatCards({ cards, cols = 4 }: { cards: DashboardStatCardData[]; cols?: 2 | 3 | 4 }) {
  const colsClass =
    cols === 2 ? "sm:grid-cols-2 lg:grid-cols-2"
    : cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3"
    : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-4 ${colsClass}`}>
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
              <Card className="shadow-none border-zinc-200 hover:border-zinc-300 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">{card.label}</p>
                      <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                        <AnimatedValue
                          value={card.rawValue}
                          isCurrency={card.isCurrency}
                          currencySymbol={card.currencySymbol}
                          currencyLocale={card.currencyLocale}
                        />
                      </p>
                      {card.sub && <p className="mt-0.5 text-xs text-zinc-400">{card.sub}</p>}
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${c.text}`} />
                    </div>
                  </div>
                  {card.alert && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      Needs restocking
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
