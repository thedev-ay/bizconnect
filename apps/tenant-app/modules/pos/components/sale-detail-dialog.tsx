"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { XCircle, Printer, AlertTriangle, RotateCcw, CheckCircle2, Ban, Wallet } from "lucide-react";
import { approveReturn, processRefund, rejectReturn, voidSale } from "../actions";
import { ReceiptPrintDialog } from "@/components/receipt";
import { ReturnDialog } from "./return-dialog";
import { cn } from "@/lib/utils";

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
  approvedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
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
    createdAt: Date;
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
  const router = useRouter();
  const [voiding, setVoiding] = useState(false);
  const [updatingReturnId, setUpdatingReturnId] = useState<string | null>(null);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  async function handleVoid() {
    setVoiding(true);
    try {
      await voidSale(tenantSlug, tenantId, sale.id);
      toast.success(`${sale.referenceNo} voided`);
      setVoidConfirmOpen(false);
      onOpenChange(false);
      router.refresh();
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
    setUpdatingReturnId(returnId);
    try {
      await approveReturn(tenantSlug, tenantId, returnId);
      toast.success("Return approved");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve return");
    } finally {
      setUpdatingReturnId(null);
    }
  }

  async function handleRejectReturn(returnId: string) {
    setUpdatingReturnId(returnId);
    try {
      await rejectReturn(tenantSlug, tenantId, returnId);
      toast.success("Return rejected");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject return");
    } finally {
      setUpdatingReturnId(null);
    }
  }

  async function handleProcessRefund(returnId: string) {
    setUpdatingReturnId(returnId);
    try {
      await processRefund(tenantSlug, tenantId, returnId, sale.paymentMethod === "cash" ? "cash" : "original_payment");
      toast.success("Refund marked as processed");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to process refund");
    } finally {
      setUpdatingReturnId(null);
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader className="border-b border-zinc-100 pb-4">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-base">{sale.referenceNo}</SheetTitle>
            {isVoided && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                Voided
              </span>
            )}
          </div>
          <SheetDescription className="mt-0.5 text-xs text-zinc-400">
            {format(new Date(sale.createdAt), "MMM d, yyyy · h:mm a")}
            {sale.servedByName && ` · ${sale.servedByName}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Payment Method</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Items</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {sale.items.length} item{sale.items.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Line Items</h3>
            <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
              <div className="divide-y divide-zinc-100">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-800">{item.name}</p>
                      <p className="text-xs text-zinc-400">
                        {item.quantity} × {fmt(item.unitPrice)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-800">
                      {fmt(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-1.5 rounded-xl border border-zinc-200 p-4 text-sm">
            <div className="flex justify-between text-zinc-500">
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
            <div className="flex justify-between font-bold text-zinc-900">
              <span>Total</span>
              <span className="tabular-nums">{fmt(sale.total)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Paid</span>
              <span className="tabular-nums">{fmt(sale.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Change</span>
              <span className="tabular-nums">{fmt(sale.change)}</span>
            </div>
          </section>

          {sale.returns.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900">Returns</h3>
              <div className="space-y-3">
                {sale.returns.map((saleReturn) => (
                  <div key={saleReturn.id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-zinc-400">{saleReturn.referenceNo}</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900 capitalize">{saleReturn.reason.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {format(new Date(saleReturn.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        saleReturn.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : saleReturn.status === "approved"
                            ? "bg-blue-50 text-blue-700"
                            : saleReturn.status === "refunded"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                      )}>
                        {saleReturn.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-zinc-600">
                      <p>{saleReturn.items.length} line item{saleReturn.items.length !== 1 ? "s" : ""} in this return</p>
                      {saleReturn.refundAmount && (
                        <p>Refund amount: <span className="font-semibold text-zinc-900">{fmt(saleReturn.refundAmount)}</span></p>
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
                          {updatingReturnId === saleReturn.id ? "Approving..." : "Approve Return"}
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
                          {updatingReturnId === saleReturn.id ? "Processing..." : "Mark Refund Complete"}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <SheetFooter className="border-t border-zinc-100">
          <div className="flex w-full flex-wrap justify-end gap-2">
            {!isVoided && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptOpen(true)}
              >
                <Printer className="mr-2 h-3.5 w-3.5" />
                Reprint Receipt
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
                  ? "Return Pending"
                  : latestReturn?.status === "approved"
                    ? "Refund Pending"
                    : allItemsReturned
                      ? "All Items Returned"
                      : "Return Items"}
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
                Void Transaction
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* Void Confirmation Dialog */}
    <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Void Transaction?</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {hasReturnActivity && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                This sale already has return activity. Use the returns workflow instead of voiding it.
              </p>
            </div>
          )}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-900">
              You are about to void <span className="font-semibold">{sale.referenceNo}</span>.
            </p>
          </div>
          <div className="text-sm text-zinc-600 space-y-1">
            <p>This action will:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Restore all items to inventory</li>
              <li>Cancel the payment transaction</li>
              <li>Mark the sale as voided permanently</li>
            </ul>
          </div>
          <p className="text-xs text-zinc-500">This action cannot be undone.</p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setVoidConfirmOpen(false)}
            disabled={voiding}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleVoid}
            disabled={voiding || hasReturnActivity}
          >
            {voiding ? "Voiding..." : "Void Transaction"}
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
