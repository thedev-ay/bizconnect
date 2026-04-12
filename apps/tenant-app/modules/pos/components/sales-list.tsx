"use client";

import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

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
  approvedAt: string | Date | null;
  refundedAt: string | Date | null;
  createdAt: string | Date;
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
  createdAt: string | Date;
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
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    filteredCount: number;
    filteredReturns: number;
  };
}

const STATUS_PILL: Record<string, React.ComponentProps<typeof StatusBadge>["tone"]> = {
  completed: "success",
  voided: "neutral",
};

const RETURN_STATUS_PILL: Record<string, React.ComponentProps<typeof StatusBadge>["tone"]> = {
  pending: "warning",
  approved: "blue",
  rejected: "neutral",
  refunded: "success",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
};

const SOURCE_BADGE: Record<string, { label: string; tone: React.ComponentProps<typeof StatusBadge>["tone"] }> = {
  pos:         { label: "POS",       tone: "blue" },
  "job-order": { label: "Job Order", tone: "violet" },
  appointment: { label: "Booking",   tone: "warning" },
};

export function SalesList({
  sales,
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  highlightedSaleId,
  pagination,
  summary,
}: SalesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Accumulate sources seen across fetches so filtering doesn't shrink the dropdown options
  const knownSourcesRef = useRef<Set<string>>(new Set<string>());
  sales.forEach((s) => knownSourcesRef.current.add(s.source));
  const sources: string[] = Array.from(knownSourcesRef.current);
  const search = searchParams.get("search") ?? "";
  const paymentFilter = searchParams.get("payment") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const sourceFilter = searchParams.get("source") ?? "all";
  const selectedSaleId = searchParams.get("saleId") ?? highlightedSaleId ?? null;

  const selectedSale =
    sales.find((sale) => sale.id === selectedSaleId) ??
    null;
  const pageValue = pagination.page;

  useEffect(() => {
    if (!highlightedSaleId) return;
    const row = document.getElementById(`sale-row-${highlightedSaleId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedSaleId]);

  useEffect(() => {
    if (!selectedSaleId) return;
    if (sales.some((sale) => sale.id === selectedSaleId)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("saleId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, sales, searchParams, selectedSaleId]);

  function updateLedgerQuery(updates: Record<string, string | null>, resetPage = false) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (resetPage) {
      params.delete("page");
    }
    if (updates.saleId === null) {
      params.delete("saleId");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openSale(saleId: string) {
    updateLedgerQuery({ saleId });
  }

  function closeSale() {
    updateLedgerQuery({ saleId: null });
  }

  const fmt = (v: string) =>
    `${currencySymbol}${Number(v).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;

  return (
    <>
      {/* Filters */}
      <div className="space-y-4 border-b border-border/70 bg-white/40 px-4 py-4 sm:px-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,160px))]">
          <div>
            <p className="eyebrow-label text-[0.64rem] tracking-[0.18em]">Sales Ledger</p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Transactions
            </h3>
          </div>
          <div className="rounded-2xl bg-white/75 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/70">Shown</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{summary.filteredCount}</p>
          </div>
          <div className="rounded-2xl bg-white/75 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/70">Page</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{pagination.page}</p>
          </div>
          <div className="rounded-2xl bg-white/75 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/70">Returns</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{summary.filteredReturns}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search reference..."
            value={search}
            onChange={(e) => updateLedgerQuery({ search: e.target.value || null }, true)}
            className="h-10 w-56 text-sm"
          />
          <Select value={paymentFilter} onValueChange={(value) => updateLedgerQuery({ payment: value }, true)}>
            <SelectTrigger className="h-10 w-36 text-sm">
              <SelectValue>
                {paymentFilter === "all" ? "Payment" : (PAYMENT_LABEL[paymentFilter] ?? paymentFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="gcash">GCash</SelectItem>
              <SelectItem value="maya">Maya</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => updateLedgerQuery({ status: value }, true)}>
            <SelectTrigger className="h-10 w-36 text-sm">
              <SelectValue>
                {statusFilter === "all" ? "Status" : statusFilter === "completed" ? "Completed" : "Voided"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
          {mounted && (sources.length > 1 || sourceFilter !== "all") && (
            <Select value={sourceFilter} onValueChange={(value) => updateLedgerQuery({ source: value }, true)}>
              <SelectTrigger className="h-10 w-36 text-sm">
                <SelectValue>
                  {sourceFilter === "all" ? "Source" : (SOURCE_BADGE[sourceFilter]?.label ?? sourceFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Source</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_BADGE[s]?.label ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reference</TableHead>
            <TableHead className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Source</TableHead>
            <TableHead className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Date</TableHead>
            <TableHead className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Items</TableHead>
            <TableHead className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Payment</TableHead>
            <TableHead className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
            <TableHead className="pr-5 text-right text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            sales.map((sale) => (
              <TableRow
                key={sale.id}
                id={`sale-row-${sale.id}`}
                className={cn(
                  "cursor-pointer bg-transparent transition-colors hover:bg-primary/5",
                  sale.status === "voided" && "opacity-60",
                  selectedSaleId === sale.id && "bg-primary/8 ring-1 ring-inset ring-primary/20"
                )}
                onClick={() => openSale(sale.id)}
              >
                <TableCell className="pl-5">
                  <div className="space-y-0.5">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {sale.referenceNo}
                    </span>
                    {sale.servedByName ? (
                      <p className="text-xs text-muted-foreground">Served by {sale.servedByName}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={SOURCE_BADGE[sale.source]?.tone ?? "neutral"}>
                    {SOURCE_BADGE[sale.source]?.label ?? sale.source}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(sale.createdAt), "MMM d, yyyy · h:mm a")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div>{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</div>
                  {sale.returns.length > 0 && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {sale.returns.length} return{sale.returns.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={STATUS_PILL[sale.status] ?? "neutral"} className="capitalize">
                      {sale.status}
                    </StatusBadge>
                    {sale.returns[0] && (
                      <StatusBadge
                        tone={RETURN_STATUS_PILL[sale.returns[0].status] ?? "neutral"}
                        className="capitalize"
                      >
                        Return {sale.returns[0].status}
                      </StatusBadge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-foreground">
                  {fmt(sale.total)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-white/35 px-4 py-3 sm:px-5">
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateLedgerQuery({ page: String(Math.max(1, pageValue - 1)) })}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateLedgerQuery({ page: String(Math.min(pagination.totalPages, pageValue + 1)) })}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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
