"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingUp, ShoppingCart, FileText, CheckCircle, RotateCcw, Clock3, CarFront, Wrench, History } from "lucide-react";
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
  key: keyof Pick<ReportsSummary, "totalRevenue" | "totalSales" | "totalInvoiced" | "paidInvoices" | "totalRefunded" | "pendingReturnCount" | "totalAssets" | "assetsWithOpenJobs" | "recentServicedAssets">;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  isCurrency: boolean;
}[] = [
  { key: "totalRevenue",       label: "Total Revenue",    icon: TrendingUp,  color: "text-violet-600",  bg: "bg-violet-50",  isCurrency: true  },
  { key: "totalSales",         label: "POS Sales",        icon: ShoppingCart,color: "text-teal-700",    bg: "bg-teal-50",    isCurrency: true  },
  { key: "totalInvoiced",      label: "Invoiced",         icon: FileText,    color: "text-blue-600",    bg: "bg-blue-50",    isCurrency: true  },
  { key: "paidInvoices",       label: "Paid Invoices",    icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", isCurrency: false },
  { key: "totalRefunded",      label: "Refunded",         icon: RotateCcw,   color: "text-amber-600",   bg: "bg-amber-50",   isCurrency: true  },
  { key: "pendingReturnCount", label: "Pending Returns",  icon: Clock3,      color: "text-slate-500",   bg: "bg-slate-100",  isCurrency: false },
];

interface Props {
  summary: Pick<ReportsSummary, "totalRevenue" | "totalSales" | "totalInvoiced" | "paidInvoices" | "totalRefunded" | "pendingReturnCount" | "totalAssets" | "assetsWithOpenJobs" | "recentServicedAssets">;
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
  const count = visibleStats.length;
  const gridCols =
    count <= 2 ? "sm:grid-cols-2" :
    count <= 3 ? "sm:grid-cols-3" :
    count <= 4 ? "sm:grid-cols-2 lg:grid-cols-4" :
    "sm:grid-cols-3 lg:grid-cols-6";

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      {visibleStats.map(({ key, label, icon: Icon, color, bg, isCurrency }, i) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.055, duration: 0.28, ease: "easeOut" }}
        >
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_42px_-32px_rgba(15,23,42,0.28)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
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
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
          </div>
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
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
      {items.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.055, duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5 last:border-b-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-4 shrink-0 text-xs font-bold text-slate-300">#{i + 1}</span>
            <p className="truncate text-sm font-medium text-slate-950">{item.name}</p>
          </div>
          <div className="flex items-center gap-6 shrink-0 text-right">
            <p className="text-xs text-slate-500 tabular-nums">{item.quantitySold} sold</p>
            <p className="w-20 text-sm font-semibold text-slate-950 tabular-nums">
              {currencySymbol}{item.revenue.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </motion.div>
      ))}
      {items.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">No sales data yet</div>
      )}
    </div>
  );
}
