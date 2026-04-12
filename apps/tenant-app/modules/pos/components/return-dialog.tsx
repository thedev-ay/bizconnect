"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Check, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/lib/use-online-status";
import { createReturn } from "../actions";
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
  status: string;
  items: SaleReturnItem[];
}

interface ReturnDialogProps {
  sale: {
    id: string;
    referenceNo: string;
    items: SaleItem[];
    returns: SaleReturn[];
    total: string;
    createdAt: string | Date;
  };
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RETURN_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong Item" },
  { value: "customer_request", label: "Customer Request" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "other", label: "Other" },
];

export function ReturnDialog({
  sale,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
}: ReturnDialogProps) {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnReason, setReturnReason] = useState("damaged");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOnline = useOnlineStatus();

  const fmt = (v: string) =>
    `${currencySymbol}${Number(v).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;

  const returnedQuantities = sale.returns
    .filter((saleReturn) => ["pending", "approved", "refunded"].includes(saleReturn.status))
    .reduce((map, saleReturn) => {
      for (const item of saleReturn.items) {
        map.set(item.saleItemId, (map.get(item.saleItemId) ?? 0) + item.quantity);
      }
      return map;
    }, new Map<string, number>());

  const returnableItems = sale.items.map((item) => {
    const alreadyReturned = returnedQuantities.get(item.id) ?? 0;
    return {
      ...item,
      alreadyReturned,
      remainingQuantity: Math.max(0, item.quantity - alreadyReturned),
    };
  });

  const toggleItem = (itemId: string) => {
    const item = returnableItems.find((entry) => entry.id === itemId);
    if (!item || item.remainingQuantity <= 0) return;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const refundAmount = returnableItems
    .filter((item) => selectedItems.has(item.id))
    .reduce((sum, item) => sum + (Number(item.unitPrice) * item.remainingQuantity), 0);

  async function handleSubmit() {
    if (!isOnline) {
      toast.error("You're offline. Returns require a connection.");
      return;
    }
    if (selectedItems.size === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    setSubmitting(true);
    try {
      const itemsToReturn = returnableItems
        .filter((item) => selectedItems.has(item.id))
        .map((item) => ({
          saleItemId: item.id,
          quantity: item.remainingQuantity,
        }));

      await createReturn(
        tenantSlug,
        tenantId,
        sale.id,
        itemsToReturn,
        returnReason,
        notes
      );

      toast.success("Return initiated successfully");
      onOpenChange(false);
      setSelectedItems(new Set());
      setNotes("");
      setReturnReason("damaged");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create return"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Return Items</DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {sale.referenceNo}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[calc(var(--radius)+2px)] border border-border/70 bg-white/80 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/70">Sale total</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{fmt(sale.total)}</p>
            </div>
            <div className="rounded-[calc(var(--radius)+2px)] border border-border/70 bg-white/80 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/70">Returnable lines</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {returnableItems.filter((item) => item.remainingQuantity > 0).length}
              </p>
            </div>
            <div className="rounded-[calc(var(--radius)+2px)] border border-border/70 bg-white/80 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary/70">Selected</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedItems.size}</p>
            </div>
          </div>

          {/* Items selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Items</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {returnableItems.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const fullyReturned = item.remainingQuantity <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    disabled={fullyReturned}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[calc(var(--radius)+2px)] border p-3 text-left transition-all",
                      isSelected
                        ? "border-primary/25 bg-primary/8"
                        : fullyReturned
                          ? "cursor-not-allowed border-border/60 bg-muted/45 opacity-60"
                          : "border-border/70 bg-white/75 hover:border-primary/20 hover:bg-primary/4"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-border bg-white"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.quantity} × {fmt(item.unitPrice)} = {fmt(item.total)}
                      </p>
                      {fullyReturned ? (
                        <StatusBadge tone="neutral" className="mt-1.5">Already fully returned</StatusBadge>
                      ) : item.alreadyReturned > 0 ? (
                        <p className="mt-1 text-[11px] font-medium text-amber-600">
                          {item.remainingQuantity} of {item.quantity} still returnable
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {returnableItems.every((item) => item.remainingQuantity <= 0) && (
              <p className="text-sm text-muted-foreground">All sale items have already been returned.</p>
            )}
          </div>

          {/* Return reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason
            </label>
            <Select value={returnReason} onValueChange={(value) => { if (value) setReturnReason(value); }}>
              <SelectTrigger className="h-9">
                <SelectValue>
                {RETURN_REASONS.find((r) => r.value === returnReason)?.label ?? returnReason}
              </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Notes
            </label>
            <Input
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className="h-9 text-sm"
            />
          </div>

          {/* Refund amount */}
          {selectedItems.size > 0 && (
            <div className="rounded-[calc(var(--radius)+2px)] border border-primary/20 bg-primary/8 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Refund</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {fmt(String(refundAmount))}
                </p>
              </div>
            </div>
          )}

          {/* Warning for damaged items */}
          {returnReason === "damaged" && (
            <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                May require approval
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isOnline || selectedItems.size === 0 || returnableItems.every((item) => item.remainingQuantity <= 0)}
          >
            {!isOnline ? <><WifiOff className="mr-2 h-4 w-4" />Offline</> : submitting ? "Creating..." : "Create Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
