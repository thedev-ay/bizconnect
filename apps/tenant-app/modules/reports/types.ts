export interface RevenueDataPoint {
  month: string;
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
  totalInvoiced: number;
  paidInvoices: number;
  revenueByMonth: RevenueDataPoint[];
  topItems: TopItem[];
  paymentMethods: PaymentMethodBreakdown[];
}
