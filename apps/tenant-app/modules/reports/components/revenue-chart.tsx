"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { RevenueDataPoint, PaymentMethodBreakdown } from "../types";

const COLORS = ["#0f8b8d", "#22c55e", "#f59e0b", "#ef4444", "#2563eb"];

interface RevenueChartProps {
  data: RevenueDataPoint[];
  currencySymbol: string;
  currencyLocale: string;
  hasPos?: boolean;
  hasBilling?: boolean;
}

export function RevenueChart({ data, currencySymbol, currencyLocale, hasPos = true, hasBilling = true }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          {hasPos && (
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f8b8d" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#0f8b8d" stopOpacity={0} />
            </linearGradient>
          )}
          {hasBilling && (
            <linearGradient id="colorInvoices" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${currencySymbol}${Number(v).toLocaleString(currencyLocale)}`}
        />
        <Tooltip
          formatter={(value: unknown) => { const v = Number(value ?? 0); return `${currencySymbol}${v.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`; }}
        />
        <Legend />
        {hasPos && (
          <Area
            type="monotone"
            dataKey="sales"
            name="POS Sales"
            stroke="#0f8b8d"
            fill="url(#colorSales)"
            strokeWidth={2}
          />
        )}
        {hasBilling && (
          <Area
            type="monotone"
            dataKey="invoices"
            name="Paid Invoices"
            stroke="#22c55e"
            fill="url(#colorInvoices)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface PaymentMethodChartProps {
  data: PaymentMethodBreakdown[];
  currencySymbol: string;
  currencyLocale: string;
}

export function PaymentMethodChart({ data, currencySymbol, currencyLocale }: PaymentMethodChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="method" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${currencySymbol}${Number(v).toLocaleString(currencyLocale)}`}
        />
        <Tooltip
          formatter={(value: unknown) => { const v = Number(value ?? 0); return `${currencySymbol}${v.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`; }}
        />
        <Bar dataKey="total" name="Revenue" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
