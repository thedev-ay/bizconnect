"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import type { JobOrder } from "../types";
import { claimJobOrder } from "../actions";
import { ReceiptPrintDialog } from "@/components/receipt";

const PAYMENT_METHODS = [
  { value: "cash",   label: "Cash",   icon: Banknote },
  { value: "gcash",  label: "GCash",  icon: Smartphone },
  { value: "card",   label: "Card",   icon: CreditCard },
] as const;

interface ClaimPaymentDialogProps {
  jobOrder: JobOrder;
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClaimPaymentDialog({
  jobOrder,
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
}: ClaimPaymentDialogProps) {
  const queryClient = useQueryClient();
  const grandTotal = jobOrder.items.reduce((s, i) => s + Number(i.total), 0);

  const [method, setMethod] = useState<string>("cash");
  const [amountPaidStr, setAmountPaidStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [claimedJobOrder, setClaimedJobOrder] = useState<any>(null);

  const amountPaid = parseFloat(amountPaidStr) || 0;
  const change = amountPaid - grandTotal;
  const isCash = method === "cash";
  const canConfirm = isCash ? amountPaid >= grandTotal : true;

  function handleOpenChange(o: boolean) {
    if (!o) {
      setMethod("cash");
      setAmountPaidStr("");
    }
    onOpenChange(o);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await claimJobOrder(tenantSlug, tenantId, jobOrder.id, {
        method,
        amountPaid: isCash ? amountPaid : grandTotal,
        total: grandTotal,
      });
      
      // Store claimed job order data for receipt
      setClaimedJobOrder({
        jobNo: jobOrder.jobNo,
        customerName: jobOrder.customerName,
        contactNo: jobOrder.contactNo,
        items: jobOrder.items,
        total: grandTotal,
        amountPaid: isCash ? amountPaid : grandTotal,
        change: isCash ? Math.max(0, amountPaid - grandTotal) : 0,
        paymentMethod: method,
        notes: jobOrder.notes,
        createdAt: new Date(),
      });
      
      // Open receipt dialog
      setReceiptOpen(true);
      
      // Close payment dialog
      handleOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to claim");
    } finally {
      setLoading(false);
    }
  }

  return (
  <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono">{jobOrder.jobNo} — Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order summary */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-1.5">
            <p className="text-sm font-semibold text-zinc-800">{jobOrder.customerName}</p>
            <div className="divide-y divide-zinc-100">
              {jobOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="min-w-0 pr-4">
                    <p className="text-xs text-zinc-600 truncate">{item.name}</p>
                    <p className="text-[10px] text-zinc-400">
                      {item.weight != null
                        ? `${Number(item.weight)} kg × ${currencySymbol}${Number(item.unitPrice).toFixed(2)}/kg`
                        : `${item.quantity} pc × ${currencySymbol}${Number(item.unitPrice).toFixed(2)}`}
                    </p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-zinc-700 shrink-0">
                    {currencySymbol}{Number(item.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-sm text-zinc-900 pt-0.5">
              <span>Total</span>
              <span className="tabular-nums">
                {currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-semibold transition-colors",
                    method === value
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount paid (cash only) */}
          {isCash && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Amount Received</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                  {currencySymbol}
                </span>
                <Input
                  type="number"
                  min={grandTotal}
                  step="0.01"
                  placeholder={grandTotal.toFixed(2)}
                  value={amountPaidStr}
                  onChange={(e) => setAmountPaidStr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canConfirm && handleConfirm()}
                  className="pl-7 text-right font-mono text-sm"
                  autoFocus
                />
              </div>
              {amountPaid > 0 && (
                <div className={cn(
                  "flex justify-between rounded-lg px-3 py-2 text-sm font-semibold",
                  change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                )}>
                  <span>{change >= 0 ? "Change" : "Short"}</span>
                  <span className="tabular-nums">
                    {currencySymbol}{Math.abs(change).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleConfirm}
            disabled={loading || !canConfirm}
          >
            {loading ? "Processing..." : "Confirm Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Receipt dialog */}
    {claimedJobOrder && (
      <ReceiptPrintDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        type="job-order"
        referenceNo={claimedJobOrder.jobNo}
        createdAt={claimedJobOrder.createdAt}
        items={claimedJobOrder.items.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
          weight: i.weight ? Number(i.weight) : null,
        }))}
        subtotal={claimedJobOrder.total}
        discount="0"
        total={claimedJobOrder.total}
        paymentMethod={claimedJobOrder.paymentMethod}
        customerName={claimedJobOrder.customerName}
        contactNo={claimedJobOrder.contactNo}
        tenantName={tenantName}
        currencySymbol={currencySymbol}
        notes={claimedJobOrder.notes}
      />
    )}
  </>
  );
}
