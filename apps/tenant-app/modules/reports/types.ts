export type Granularity = "daily" | "weekly" | "monthly";

export interface RevenueDataPoint {
  label: string;
  sales: number;
  invoices: number;
}

export interface TopItem {
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  total: number;
}

export interface ReportsSummary {
  totalRevenue: number;
  totalSales: number;
  salesCompletedCount: number;
  salesVoidedCount: number;
  todaySalesRevenue: number;
  todaySalesCount: number;
  totalInvoiced: number;
  paidInvoices: number;
  totalRefunded: number;
  refundCount: number;
  pendingReturnCount: number;
  totalAssets: number;
  assetsWithOpenJobs: number;
  recentServicedAssets: number;
  revenueByMonth: RevenueDataPoint[];
  topItems: TopItem[];
  paymentMethods: PaymentMethodBreakdown[];
}
