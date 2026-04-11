"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueChartProps {
  data: Array<{ day: string; revenue: number; transactions: number }>;
  currencySymbol: string;
}

export function RevenueChart({ data, currencySymbol }: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-none border-zinc-200">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-zinc-700">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-12 text-center text-sm text-zinc-400">
          No sales data available
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
    <Card className="shadow-none border-zinc-200">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-zinc-700">Revenue Trend (Last 30 Days)</CardTitle>
        <p className="text-xs text-zinc-400 mt-1">
          Average: {currencySymbol}{avgRevenue.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dayDisplay"
              fontSize={12}
              stroke="#9ca3af"
              tick={{ fill: "#6b7280" }}
            />
            <YAxis
              fontSize={12}
              stroke="#9ca3af"
              tick={{ fill: "#6b7280" }}
              tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
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
      <Card className="shadow-none border-zinc-200">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-zinc-700">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-12 text-center text-sm text-zinc-400">
          No transaction data available
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
    <Card className="shadow-none border-zinc-200">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-zinc-700">Transaction Volume</CardTitle>
        <p className="text-xs text-zinc-400 mt-1">
          Average: {avgTransactions} sales/day
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dayDisplay"
              fontSize={12}
              stroke="#9ca3af"
              tick={{ fill: "#6b7280" }}
            />
            <YAxis
              fontSize={12}
              stroke="#9ca3af"
              tick={{ fill: "#6b7280" }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}
              formatter={(value) => [value, "Transactions"]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar
              dataKey="transactions"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
