import { getTenant } from "@/lib/tenant";
import { getReportsSummary } from "@/modules/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueChart, PaymentMethodChart } from "@/modules/reports";
import { TrendingUp, ShoppingCart, FileText, CheckCircle } from "lucide-react";

interface ReportsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  const summary = await getReportsSummary(tenant.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Reports & Analytics</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Last 12 months overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Total Revenue</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {tenant.currencySymbol}{summary.totalRevenue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">POS Sales</p>
                <p className="mt-1.5 text-2xl font-bold text-indigo-600">
                  {tenant.currencySymbol}{summary.totalSales.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <ShoppingCart className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Invoiced</p>
                <p className="mt-1.5 text-2xl font-bold text-blue-600">
                  {tenant.currencySymbol}{summary.totalInvoiced.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Paid Invoices</p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-600">{summary.paidInvoices}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none border-zinc-200">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-zinc-900">Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={summary.revenueByMonth} currencySymbol={tenant.currencySymbol} currencyLocale={tenant.currencyLocale} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none border-zinc-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-900">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.topItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-400">No sales data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-100 hover:bg-transparent">
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Item</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Qty Sold</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.topItems.map((item) => (
                    <TableRow key={item.name} className="border-zinc-100 hover:bg-zinc-50/50">
                      <TableCell className="text-sm font-medium text-zinc-900">{item.name}</TableCell>
                      <TableCell className="text-right text-sm text-zinc-700">{item.quantitySold}</TableCell>
                      <TableCell className="text-right text-sm text-zinc-700">
                        {tenant.currencySymbol}{item.revenue.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-900">Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.paymentMethods.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-400">No sales data yet.</p>
            ) : (
              <PaymentMethodChart data={summary.paymentMethods} currencySymbol={tenant.currencySymbol} currencyLocale={tenant.currencyLocale} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
