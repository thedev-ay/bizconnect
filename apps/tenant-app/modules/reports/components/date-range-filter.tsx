"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { format, subDays, startOfDay } from "date-fns";
import type { Granularity } from "../types";

const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");
const daysAgo = (n: number) => startOfDay(subDays(new Date(), n - 1));

const PRESETS: { label: string; days: number; granularity: Granularity }[] = [
  { label: "7D",       days: 7,   granularity: "daily"   },
  { label: "30D",      days: 30,  granularity: "daily"   },
  { label: "3 months", days: 90,  granularity: "weekly"  },
  { label: "6 months", days: 180, granularity: "monthly" },
  { label: "12 months",days: 365, granularity: "monthly" },
];

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "daily",   label: "Daily"   },
  { value: "weekly",  label: "Weekly"  },
  { value: "monthly", label: "Monthly" },
];

interface Props {
  from: string;
  to: string;
  granularity: Granularity;
}

export function DateRangeFilter({ from, to, granularity }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) params.set(k, v);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const today = toDateStr(new Date());

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.22)] sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map((p) => {
          const pFrom = toDateStr(daysAgo(p.days));
          const active = from === pFrom && to === today && granularity === p.granularity;
          return (
            <button
              key={p.label}
              onClick={() => push({ from: pFrom, to: today, granularity: p.granularity })}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="hidden select-none text-slate-300 sm:inline">|</span>

      <div className="flex flex-wrap items-center gap-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            onClick={() => push({ granularity: g.value })}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              granularity === g.value
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-slate-900"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <span className="hidden select-none text-slate-300 sm:inline">|</span>

      <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-1.5">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => push({ from: e.target.value })}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="hidden sm:inline">–</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => push({ to: e.target.value })}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
