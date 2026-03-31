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
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Last 12 months overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{summary.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">POS Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              ₱{summary.totalSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₱{summary.totalInvoiced.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.paidInvoices}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={summary.revenueByMonth} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.topItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales data yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.topItems.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantitySold}</TableCell>
                      <TableCell className="text-right">
                        ₱{item.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.paymentMethods.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales data yet.</p>
            ) : (
              <PaymentMethodChart data={summary.paymentMethods} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
