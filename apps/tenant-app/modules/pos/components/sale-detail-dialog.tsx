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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { voidSale } from "../actions";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  total: string;
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
  };
  tenantSlug: string;
  tenantId: string;
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
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
}: SaleDetailProps) {
  const router = useRouter();
  const [voiding, setVoiding] = useState(false);

  async function handleVoid() {
    if (!confirm(`Void transaction ${sale.referenceNo}? This will restore stock and cannot be undone.`)) return;
    setVoiding(true);
    try {
      await voidSale(tenantSlug, tenantId, sale.id);
      toast.success(`${sale.referenceNo} voided`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base">{sale.referenceNo}</DialogTitle>
            {isVoided && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                Voided
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {format(new Date(sale.createdAt), "MMM d, yyyy · h:mm a")}
            {sale.servedByName && ` · ${sale.servedByName}`}
          </p>
        </DialogHeader>

        {/* Items */}
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 divide-y divide-zinc-100">
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

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
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
            <span>Paid ({PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod})</span>
            <span className="tabular-nums">{fmt(sale.amountPaid)}</span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Change</span>
            <span className="tabular-nums">{fmt(sale.change)}</span>
          </div>
        </div>

        {!isVoided && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={handleVoid}
            disabled={voiding}
          >
            <XCircle className="mr-2 h-3.5 w-3.5" />
            {voiding ? "Voiding..." : "Void Transaction"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
