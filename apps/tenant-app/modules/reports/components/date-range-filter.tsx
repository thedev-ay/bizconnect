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
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => {
          const pFrom = toDateStr(daysAgo(p.days));
          const active = from === pFrom && to === today && granularity === p.granularity;
          return (
            <button
              key={p.label}
              onClick={() => push({ from: pFrom, to: today, granularity: p.granularity })}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                active
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="text-zinc-200 select-none">|</span>

      {/* Granularity */}
      <div className="flex items-center gap-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            onClick={() => push({ granularity: g.value })}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              granularity === g.value
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <span className="text-zinc-200 select-none">|</span>

      {/* Custom range */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => push({ from: e.target.value })}
          className="border border-zinc-200 rounded-md px-2 py-1 text-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <span>–</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => push({ to: e.target.value })}
          className="border border-zinc-200 rounded-md px-2 py-1 text-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>
    </div>
  );
}
