import { prisma } from "@bizconnect/db";
import { getTenant } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Package, AlertCircle, CheckCircle } from "lucide-react";
import { ReturnApprovalView } from "@/modules/pos/components/return-approval-view";

interface ReturnsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ReturnsPage({ params }: ReturnsPageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);

  const returns = await prisma.saleReturn.findMany({
    where: { tenantId: tenant.id },
    include: {
      sale: {
        select: {
          id: true,
          referenceNo: true,
          createdAt: true,
          total: true,
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
      },
      items: {
        select: {
          id: true,
          quantity: true,
          itemId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = returns.filter((r) => r.status === "pending");
  const approved = returns.filter((r) => r.status === "approved");
  const rejected = returns.filter((r) => r.status === "rejected");

  const totalRefundAmount = pending.reduce(
    (sum, r) => sum + Number(r.refundAmount),
    0
  );

  const fmt = (v: string | number) =>
    `${tenant.currencySymbol}${Number(v).toLocaleString(tenant.currencyLocale, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/${tenantSlug}/pos`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Returns Management
            </h1>
          </div>
          <p className="text-sm text-zinc-500 pl-9">{returns.length} total returns</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Pending Returns</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {pending.length}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {fmt(totalRefundAmount)} pending
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Approved</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {approved.length}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {fmt(
                    approved.reduce((sum, r) => sum + Number(r.refundAmount), 0)
                  )}{" "}
                  refunded
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-zinc-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500">Rejected</p>
                <p className="mt-1.5 text-2xl font-bold text-zinc-900">
                  {rejected.length}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">not refunded</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100">
                <Package className="h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns approval view */}
      <ReturnApprovalView
        returns={returns}
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        currencySymbol={tenant.currencySymbol}
        currencyLocale={tenant.currencyLocale}
      />
    </div>
  );
}
