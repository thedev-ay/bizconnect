"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueChartProps {
  data: Array<{ day: string; revenue: number; transactions: number }>;
  currencySymbol: string;
}

export function RevenueChart({ data, currencySymbol }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-border/60 bg-card/95">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div>
            <p className="eyebrow-label">Revenue</p>
            <CardTitle className="mt-1 text-base text-foreground">Trend</CardTitle>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/70">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
          No sales
        </CardContent>
      </Card>
    );
  }

  // Format dates for display
  const chartData = data.map((d) => ({
    ...d,
    dayDisplay: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const avgRevenue = Math.round(data.reduce((sum, d) => sum + d.revenue, 0) / data.length);

  return (
    <Card className="border-border/60 bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <p className="eyebrow-label">Revenue</p>
          <CardTitle className="mt-1 text-base text-foreground">30 days</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg {currencySymbol}{avgRevenue.toLocaleString()}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200/70">
          <TrendingUp className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-1">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
            <XAxis
              dataKey="dayDisplay"
              fontSize={12}
              stroke="#94a3b8"
              tick={{ fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              fontSize={12}
              stroke="#94a3b8"
              tick={{ fill: "#64748b" }}
              tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(226,232,240,0.9)",
                borderRadius: "16px",
                boxShadow: "0 18px 40px -28px rgba(15, 23, 42, 0.35)",
              }}
              formatter={(value) => [`${currencySymbol}${Number(value).toLocaleString()}`, "Revenue"]}
              labelFormatter={(label) => `${label}`}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface TransactionChartProps {
  data: Array<{ day: string; revenue: number; transactions: number }>;
}

export function TransactionChart({ data }: TransactionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-border/60 bg-card/95">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div>
            <p className="eyebrow-label">Volume</p>
            <CardTitle className="mt-1 text-base text-foreground">Transactions</CardTitle>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/80 text-sky-700 ring-1 ring-sky-200/70">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
          No transactions
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    dayDisplay: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const totalTransactions = data.reduce((sum, d) => sum + d.transactions, 0);
  const avgTransactions = Math.round(totalTransactions / data.length);

  return (
    <Card className="border-border/60 bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <p className="eyebrow-label">Volume</p>
          <CardTitle className="mt-1 text-base text-foreground">30 days</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg {avgTransactions}/day
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100/80 text-sky-700 ring-1 ring-sky-200/70">
          <BarChart3 className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-1">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
            <XAxis
              dataKey="dayDisplay"
              fontSize={12}
              stroke="#94a3b8"
              tick={{ fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              fontSize={12}
              stroke="#94a3b8"
              tick={{ fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(226,232,240,0.9)",
                borderRadius: "16px",
                boxShadow: "0 18px 40px -28px rgba(15, 23, 42, 0.35)",
              }}
              formatter={(value) => [value, "Transactions"]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar
              dataKey="transactions"
              fill="#0f93a2"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
