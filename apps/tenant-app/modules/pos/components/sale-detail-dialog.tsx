"use client";

import type * as React from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnlineStatus } from "@/lib/use-online-status";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { XCircle, Printer, AlertTriangle, RotateCcw, CheckCircle2, Ban, Wallet, X } from "lucide-react";
import { approveReturn, processRefund, rejectReturn, voidSale } from "../actions";
import { ReceiptPrintDialog } from "@/components/receipt";
import { ReturnDialog } from "./return-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

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

interface SaleReturn {
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

interface SaleDetailProps {
  sale: {
    id: string;
    referenceNo: string;
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
    returns: SaleReturn[];
  };
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
};

const RETURN_TONE: Record<string, React.ComponentProps<typeof StatusBadge>["tone"]> = {
  pending: "warning",
  approved: "blue",
  refunded: "success",
  rejected: "neutral",
};

export function SaleDetailDialog({
  sale,
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
}: SaleDetailProps) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [voiding, setVoiding] = useState(false);
  const [updatingReturnId, setUpdatingReturnId] = useState<string | null>(null);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  async function handleVoid() {
    if (!isOnline) { toast.error("You're offline. Connect to void sales."); return; }
    setVoiding(true);
    try {
      await voidSale(tenantSlug, tenantId, sale.id);
      toast.success(`${sale.referenceNo} voided`);
      setVoidConfirmOpen(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sales", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to void sale");
    } finally {
      setVoiding(false);
    }
  }

  const fmt = (v: string) =>
    `${currencySymbol}${Number(v).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;

  const isVoided = sale.status === "voided";
  const latestReturn = sale.returns[0] ?? null;
  const hasReturnActivity = sale.returns.some((saleReturn) =>
    ["pending", "approved", "refunded"].includes(saleReturn.status)
  );
  const returnedQuantities = sale.returns
    .filter((saleReturn) => ["pending", "approved", "refunded"].includes(saleReturn.status))
    .reduce((map, saleReturn) => {
      for (const item of saleReturn.items) {
        map.set(item.saleItemId, (map.get(item.saleItemId) ?? 0) + item.quantity);
      }
      return map;
    }, new Map<string, number>());
  const allItemsReturned = sale.items.every(
    (item) => (returnedQuantities.get(item.id) ?? 0) >= item.quantity
  );

  async function handleApproveReturn(returnId: string) {
    if (!isOnline) { toast.error("You're offline. Connect to approve returns."); return; }
    setUpdatingReturnId(returnId);
    try {
      await approveReturn(tenantSlug, tenantId, returnId);
      toast.success("Return approved");
      queryClient.invalidateQueries({ queryKey: ["sales", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve return");
    } finally {
      setUpdatingReturnId(null);
    }
  }

  async function handleRejectReturn(returnId: string) {
    if (!isOnline) { toast.error("You're offline. Connect to reject returns."); return; }
    setUpdatingReturnId(returnId);
    try {
      await rejectReturn(tenantSlug, tenantId, returnId);
      toast.success("Return rejected");
      queryClient.invalidateQueries({ queryKey: ["sales", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject return");
    } finally {
      setUpdatingReturnId(null);
    }
  }

  async function handleProcessRefund(returnId: string) {
    if (!isOnline) { toast.error("You're offline. Connect to process refunds."); return; }
    setUpdatingReturnId(returnId);
    try {
      await processRefund(tenantSlug, tenantId, returnId, sale.paymentMethod === "cash" ? "cash" : "original_payment");
      toast.success("Refund marked as processed");
      queryClient.invalidateQueries({ queryKey: ["sales", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to process refund");
    } finally {
      setUpdatingReturnId(null);
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-l-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(236,253,250,0.92)_100%)] sm:max-w-xl">
        <SheetHeader className="border-b border-border/70 pb-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow-label text-[0.64rem] tracking-[0.18em]">Transaction</p>
              <SheetTitle className="text-base">{sale.referenceNo}</SheetTitle>
            </div>
            {isVoided && (
              <StatusBadge tone="neutral">
                Voided
              </StatusBadge>
            )}
          </div>
          <SheetDescription className="mt-1 text-xs text-muted-foreground">
            {format(new Date(sale.createdAt), "MMM d, yyyy · h:mm a")}
            {sale.servedByName && ` · ${sale.servedByName}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[calc(var(--radius)+2px)] border border-border/70 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary/70">Payment</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                  {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
              </p>
            </div>
            <div className="rounded-[calc(var(--radius)+2px)] border border-border/70 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary/70">Items</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                  {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-[calc(var(--radius)+2px)] border border-border/70 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary/70">Status</p>
              <p className="mt-2">
                <StatusBadge tone={isVoided ? "neutral" : "success"} className="capitalize">
                  {sale.status}
                </StatusBadge>
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Items</h3>
            <div className="overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80">
              <div className="divide-y divide-border/60">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {fmt(item.unitPrice)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {fmt(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-1.5 rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80 p-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(sale.subtotal)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="tabular-nums">−{fmt(sale.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{fmt(sale.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Paid</span>
              <span className="tabular-nums">{fmt(sale.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Change</span>
              <span className="tabular-nums">{fmt(sale.change)}</span>
            </div>
          </section>

          {sale.returns.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Returns</h3>
              <div className="space-y-3">
                {sale.returns.map((saleReturn) => (
                  <div key={saleReturn.id} className="rounded-[calc(var(--radius)+4px)] border border-border/70 bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{saleReturn.referenceNo}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground capitalize">{saleReturn.reason.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(saleReturn.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                      <StatusBadge tone={RETURN_TONE[saleReturn.status] ?? "neutral"} className="capitalize">
                        {saleReturn.status}
                      </StatusBadge>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p>{saleReturn.items.length} item{saleReturn.items.length !== 1 ? "s" : ""}</p>
                      {saleReturn.refundAmount && (
                        <p>Refund: <span className="font-semibold text-foreground">{fmt(saleReturn.refundAmount)}</span></p>
                      )}
                      {saleReturn.notes && <p>Notes: {saleReturn.notes}</p>}
                    </div>

                    {saleReturn.status === "pending" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveReturn(saleReturn.id)}
                          disabled={updatingReturnId === saleReturn.id}
                        >
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                          {updatingReturnId === saleReturn.id ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectReturn(saleReturn.id)}
                          disabled={updatingReturnId === saleReturn.id}
                        >
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {saleReturn.status === "approved" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleProcessRefund(saleReturn.id)}
                          disabled={updatingReturnId === saleReturn.id}
                        >
                          <Wallet className="mr-2 h-3.5 w-3.5" />
                          {updatingReturnId === saleReturn.id ? "Processing..." : "Complete Refund"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <SheetFooter className="border-t border-border/70">
          <div className="flex w-full flex-wrap justify-end gap-2">
            {!isVoided && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptOpen(true)}
              >
                <Printer className="mr-2 h-3.5 w-3.5" />
                Receipt
              </Button>
            )}

            {!isVoided && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReturnOpen(true)}
                disabled={latestReturn?.status === "pending" || latestReturn?.status === "approved" || allItemsReturned}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                {latestReturn?.status === "pending"
                  ? "Pending Return"
                  : latestReturn?.status === "approved"
                    ? "Pending Refund"
                    : allItemsReturned
                      ? "Returned"
                      : "Return"}
              </Button>
            )}

            {!isVoided && !hasReturnActivity && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setVoidConfirmOpen(true)}
                disabled={voiding}
              >
                <XCircle className="mr-2 h-3.5 w-3.5" />
                Void
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* Void Confirmation Dialog */}
    <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-sm flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Sales / Confirm</p>
              <div className="mt-1 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Void sale?
                </DialogTitle>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setVoidConfirmOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 px-6 py-5">
          {hasReturnActivity && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                This sale already has return activity.
              </p>
            </div>
          )}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-900">
              Void <span className="font-semibold">{sale.referenceNo}</span>.
            </p>
          </div>
          <p className="text-xs text-zinc-500">This cannot be undone.</p>
        </div>

        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setVoidConfirmOpen(false)}
            disabled={voiding}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={voiding || hasReturnActivity}
            className="rounded-full"
          >
            {voiding ? "Voiding..." : "Void"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Receipt print dialog */}
    <ReceiptPrintDialog
      open={receiptOpen}
      onOpenChange={setReceiptOpen}
      type="sale"
      referenceNo={sale.referenceNo}
      createdAt={sale.createdAt}
      items={sale.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      }))}
      subtotal={sale.subtotal}
      discount={sale.discount}
      total={sale.total}
      amountPaid={sale.amountPaid}
      change={sale.change}
      paymentMethod={sale.paymentMethod}
      tenantName={tenantName}
      currencySymbol={currencySymbol}
    />

    {/* Return dialog */}
    <ReturnDialog
      sale={sale}
      tenantSlug={tenantSlug}
      tenantId={tenantId}
      currencySymbol={currencySymbol}
      currencyLocale={currencyLocale}
      open={returnOpen}
      onOpenChange={setReturnOpen}
    />
  </>
  );
}
