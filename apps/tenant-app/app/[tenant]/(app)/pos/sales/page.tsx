import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, TrendingUp, XCircle, Banknote } from "lucide-react";
import { SalesList } from "@/modules/pos/components/sales-list";

interface SalesPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SalesPage({ params }: SalesPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const sales = await prisma.sale.findMany({
    where: { tenantId: tenant.id },
    include: {
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const completed = sales.filter((s) => s.status === "completed");
  const voided = sales.filter((s) => s.status === "voided");
  const totalRevenue = completed.reduce((sum, s) => sum + Number(s.total), 0);
  const todaySales = completed.filter(
    (s) => new Date(s.createdAt).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

  const fmt = (v: number) =>
    `${tenant.currencySymbol}${v.toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${tenantSlug}/pos`}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Sales History</h1>
          </div>
          <p className="text-sm text-zinc-500 pl-9">{sales.length} total transactions</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Total Revenue</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{fmt(totalRevenue)}</p>
                <p className="mt-0.5 text-xs text-zinc-400">all time</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Today's Revenue</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{fmt(todayRevenue)}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{todaySales.length} transactions</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Banknote className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Completed</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">{completed.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <ShoppingBag className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Voided</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-400">{voided.length}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <XCircle className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-none border-zinc-200">
        <SalesList
          sales={sales.map((s) => ({
            ...s,
            subtotal: s.subtotal.toString(),
            discount: s.discount.toString(),
            total: s.total.toString(),
            amountPaid: s.amountPaid.toString(),
            change: s.change.toString(),
            servedByName: null,
            items: s.items.map((i) => ({
              ...i,
              unitPrice: i.unitPrice.toString(),
              total: i.total.toString(),
            })),
          }))}
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          currencySymbol={tenant.currencySymbol}
          currencyLocale={tenant.currencyLocale}
        />
      </Card>
    </div>
  );
}
