"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingUp, ShoppingCart, FileText, CheckCircle, RotateCcw, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReportsSummary } from "../types";

function AnimatedCurrency({ value, symbol, locale, className }: {
  value: number; symbol: string; locale: string; className?: string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 22, stiffness: 160 });
  const display = useTransform(spring, (v) =>
    `${symbol}${Math.round(v).toLocaleString(locale, { minimumFractionDigits: 0 })}`
  );
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span className={className}>{display}</motion.span>;
}

function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 22, stiffness: 160 });
  const display = useTransform(spring, (v) => String(Math.round(v)));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span className={className}>{display}</motion.span>;
}

const STATS: {
  key: keyof Pick<ReportsSummary, "totalRevenue" | "totalSales" | "totalInvoiced" | "paidInvoices" | "totalRefunded" | "pendingReturnCount">;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  isCurrency: boolean;
}[] = [
  { key: "totalRevenue",       label: "Total Revenue",    icon: TrendingUp,  color: "text-violet-600",  bg: "bg-violet-50",  isCurrency: true  },
  { key: "totalSales",         label: "POS Sales",        icon: ShoppingCart,color: "text-indigo-600",  bg: "bg-indigo-50",  isCurrency: true  },
  { key: "totalInvoiced",      label: "Invoiced",         icon: FileText,    color: "text-blue-600",    bg: "bg-blue-50",    isCurrency: true  },
  { key: "paidInvoices",       label: "Paid Invoices",    icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", isCurrency: false },
  { key: "totalRefunded",      label: "Refunded",         icon: RotateCcw,   color: "text-amber-600",   bg: "bg-amber-50",   isCurrency: true  },
  { key: "pendingReturnCount", label: "Pending Returns",  icon: Clock3,      color: "text-zinc-500",    bg: "bg-zinc-100",   isCurrency: false },
];

interface Props {
  summary: Pick<ReportsSummary, "totalRevenue" | "totalSales" | "totalInvoiced" | "paidInvoices" | "totalRefunded" | "pendingReturnCount">;
  currencySymbol: string;
  currencyLocale: string;
  hasPos: boolean;
  hasBilling: boolean;
}

const MODULE_GATE: Partial<Record<typeof STATS[number]["key"], "pos" | "billing">> = {
  totalSales:         "pos",
  totalRefunded:      "pos",
  pendingReturnCount: "pos",
  totalInvoiced:      "billing",
  paidInvoices:       "billing",
};

export function ReportsSummaryCards({ summary, currencySymbol, currencyLocale, hasPos, hasBilling }: Props) {
  const visibleStats = STATS.filter(({ key }) => {
    const gate = MODULE_GATE[key];
    if (gate === "pos" && !hasPos) return false;
    if (gate === "billing" && !hasBilling) return false;
    if (key === "totalRevenue" && !hasPos && !hasBilling) return false;
    return true;
  });
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {visibleStats.map(({ key, label, icon: Icon, color, bg, isCurrency }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.055, duration: 0.28, ease: "easeOut" }}
        >
          <Card className="shadow-none border-zinc-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500">{label}</p>
                  {isCurrency ? (
                    <AnimatedCurrency
                      value={summary[key] as number}
                      symbol={currencySymbol}
                      locale={currencyLocale}
                      className={`mt-1.5 text-2xl font-bold block ${color}`}
                    />
                  ) : (
                    <AnimatedCount
                      value={summary[key] as number}
                      className={`mt-1.5 text-2xl font-bold block ${color}`}
                    />
                  )}
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function TopItemsTable({ items, currencySymbol, currencyLocale }: {
  items: ReportsSummary["topItems"];
  currencySymbol: string;
  currencyLocale: string;
}) {
  return (
    <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
      {items.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.055, duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-bold text-zinc-300 w-4 shrink-0">#{i + 1}</span>
            <p className="text-sm font-medium text-zinc-800 truncate">{item.name}</p>
          </div>
          <div className="flex items-center gap-6 shrink-0 text-right">
            <p className="text-xs text-zinc-400 tabular-nums">{item.quantitySold} sold</p>
            <p className="text-sm font-semibold text-zinc-800 tabular-nums w-20">
              {currencySymbol}{item.revenue.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </motion.div>
      ))}
      {items.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-zinc-400">No sales data yet</div>
      )}
    </div>
  );
}
