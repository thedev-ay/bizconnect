"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";

type ChartPoint = { day: string; revenue: number; transactions: number };

function ChartShell({
  eyebrow,
  title,
  meta,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  icon: typeof TrendingUp;
  children: React.ReactNode;
}) {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow-label">{eyebrow}</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {meta ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {children}
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number | string; name?: string }>;
  label?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value ?? 0);
  return (
    <div className="rounded-xl border border-border/70 bg-popover/95 px-3 py-2 text-xs shadow-[0_18px_40px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {formatter(value)}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-6 py-14 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function RevenueChart({
  data,
  currencySymbol,
}: {
  data: ChartPoint[];
  currencySymbol: string;
}) {
  if (!data?.length) {
    return (
      <ChartShell eyebrow="Revenue" title="Trend" icon={TrendingUp}>
        <EmptyState label="No sales in the last 30 days" />
      </ChartShell>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    dayDisplay: new Date(d.day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const avgRevenue = Math.round(
    data.reduce((sum, d) => sum + d.revenue, 0) / data.length
  );

  return (
    <ChartShell
      eyebrow="Revenue"
      title="30 days"
      meta={`Avg ${currencySymbol}${avgRevenue.toLocaleString()}`}
      icon={TrendingUp}
    >
      <div className="px-2 py-3">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 8, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="color-mix(in oklch, var(--border) 80%, transparent)"
              vertical={false}
            />
            <XAxis
              dataKey="dayDisplay"
              fontSize={11}
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              fontSize={11}
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{
                stroke: "color-mix(in oklch, var(--primary) 30%, transparent)",
                strokeWidth: 1,
              }}
              content={
                <ChartTooltipContent
                  formatter={(v) =>
                    `${currencySymbol}${v.toLocaleString()}`
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}

export function TransactionChart({ data }: { data: ChartPoint[] }) {
  if (!data?.length) {
    return (
      <ChartShell eyebrow="Volume" title="Transactions" icon={BarChart3}>
        <EmptyState label="No transactions yet" />
      </ChartShell>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    dayDisplay: new Date(d.day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const total = data.reduce((sum, d) => sum + d.transactions, 0);
  const avg = Math.round(total / data.length);

  return (
    <ChartShell
      eyebrow="Volume"
      title="30 days"
      meta={`Avg ${avg}/day`}
      icon={BarChart3}
    >
      <div className="px-2 py-3">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="color-mix(in oklch, var(--border) 80%, transparent)"
              vertical={false}
            />
            <XAxis
              dataKey="dayDisplay"
              fontSize={11}
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              fontSize={11}
              stroke="var(--muted-foreground)"
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{
                fill: "color-mix(in oklch, var(--primary) 8%, transparent)",
              }}
              content={
                <ChartTooltipContent
                  formatter={(v) => `${v.toLocaleString()} sales`}
                />
              }
            />
            <Bar
              dataKey="transactions"
              fill="var(--chart-1)"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}
