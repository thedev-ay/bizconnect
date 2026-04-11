"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SaleDetailDialog } from "./sale-detail-dialog";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface SaleReturnItem {
  id: string;
  saleItemId: string;
  quantity: number;
}

interface SaleReturnRecord {
  id: string;
  referenceNo: string;
  reason: string;
  notes: string | null;
  status: string;
  refundAmount: string | null;
  refundMethod: string | null;
  approvedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  items: SaleReturnItem[];
}

interface SaleRecord {
  id: string;
  referenceNo: string;
  source: string;
  subtotal: string;
  discount: string;
  total: string;
  amountPaid: string;
  change: string;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  servedByName?: string | null;
  items: SaleItem[];
  returns: SaleReturnRecord[];
}

interface SalesListProps {
  sales: SaleRecord[];
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  highlightedSaleId?: string;
}

const STATUS_PILL: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  voided: "bg-zinc-100 text-zinc-500",
};

const RETURN_STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  rejected: "bg-zinc-100 text-zinc-500",
  refunded: "bg-emerald-50 text-emerald-700",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
};

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  pos:         { label: "POS",       className: "bg-blue-50 text-blue-700" },
  "job-order": { label: "Job Order", className: "bg-violet-50 text-violet-700" },
  appointment: { label: "Booking",   className: "bg-amber-50 text-amber-700" },
};

export function SalesList({
  sales,
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  highlightedSaleId,
}: SalesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sources = Array.from(new Set(sales.map((s) => s.source)));
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(highlightedSaleId ?? null);

  const filtered = sales.filter((s) => {
    if (search && !s.referenceNo.toLowerCase().includes(search.toLowerCase())) return false;
    if (paymentFilter !== "all" && s.paymentMethod !== paymentFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
    return true;
  });

  const selectedSale =
    filtered.find((sale) => sale.id === selectedSaleId) ??
    sales.find((sale) => sale.id === selectedSaleId) ??
    null;

  useEffect(() => {
    if (!highlightedSaleId) return;
    setSelectedSaleId(highlightedSaleId);
    const row = document.getElementById(`sale-row-${highlightedSaleId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedSaleId]);

  function updateSaleQuery(saleId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (saleId) {
      params.set("saleId", saleId);
    } else {
      params.delete("saleId");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openSale(saleId: string) {
    setSelectedSaleId(saleId);
    updateSaleQuery(saleId);
  }

  function closeSale() {
    setSelectedSaleId(null);
    updateSaleQuery(null);
  }

  const fmt = (v: string) =>
    `${currencySymbol}${Number(v).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-4 border-b border-zinc-100">
        <Input
          placeholder="Search reference no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-52 text-sm"
        />
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="gcash">GCash</SelectItem>
            <SelectItem value="maya">Maya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
        {mounted && sources.length > 1 && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_BADGE[s]?.label ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-zinc-100 hover:bg-transparent">
            <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Reference</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Source</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Payment</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 pr-5">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((sale) => (
              <TableRow
                key={sale.id}
                id={`sale-row-${sale.id}`}
                className={cn(
                  "border-zinc-50 cursor-pointer transition-colors hover:bg-zinc-50",
                  sale.status === "voided" && "opacity-60",
                  selectedSaleId === sale.id && "bg-emerald-50/60 ring-1 ring-emerald-200"
                )}
                onClick={() => openSale(sale.id)}
              >
                <TableCell className="pl-5">
                  <span className="font-mono text-sm font-medium text-zinc-800">
                    {sale.referenceNo}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    SOURCE_BADGE[sale.source]?.className ?? "bg-zinc-100 text-zinc-500"
                  )}>
                    {SOURCE_BADGE[sale.source]?.label ?? sale.source}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {format(new Date(sale.createdAt), "MMM d, yyyy · h:mm a")}
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  <div>{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</div>
                  {sale.returns.length > 0 && (
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {sale.returns.length} return{sale.returns.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      STATUS_PILL[sale.status] ?? "bg-zinc-100 text-zinc-500"
                    )}>
                      {sale.status}
                    </span>
                    {sale.returns[0] && (
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        RETURN_STATUS_PILL[sale.returns[0].status] ?? "bg-zinc-100 text-zinc-500"
                      )}>
                        Return {sale.returns[0].status}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-zinc-800">
                  {fmt(sale.total)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedSale && (
        <SaleDetailDialog
          sale={selectedSale}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          tenantName={tenantName}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={Boolean(selectedSale)}
          onOpenChange={(o) => { if (!o) closeSale(); }}
        />
      )}
    </>
  );
}
