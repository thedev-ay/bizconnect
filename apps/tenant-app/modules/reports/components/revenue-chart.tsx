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

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInvoices" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `₱${Number(v).toLocaleString("en-PH")}`}
        />
        <Tooltip
          formatter={(value: unknown) => { const v = Number(value ?? 0); return `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`; }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="sales"
          name="POS Sales"
          stroke="#6366f1"
          fill="url(#colorSales)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="invoices"
          name="Paid Invoices"
          stroke="#22c55e"
          fill="url(#colorInvoices)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface PaymentMethodChartProps {
  data: PaymentMethodBreakdown[];
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="method" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `₱${Number(v).toLocaleString("en-PH")}`}
        />
        <Tooltip
          formatter={(value: unknown) => { const v = Number(value ?? 0); return `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`; }}
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
