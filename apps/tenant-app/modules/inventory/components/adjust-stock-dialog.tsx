"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { adjustStock } from "../actions";

interface AdjustStockDialogProps {
  item: { id: string; name: string; quantity: number };
  tenantSlug: string;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustStockDialog({ item, tenantSlug, tenantId, open, onOpenChange }: AdjustStockDialogProps) {
  const router = useRouter();
  const [type, setType] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  const delta = type === "add" ? Number(qty) : -Number(qty);
  const newQty = item.quantity + delta;

  async function handleSave() {
    const amount = Number(qty);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (type === "remove" && amount > item.quantity) {
      toast.error("Cannot remove more than current stock");
      return;
    }
    setSaving(true);
    try {
      await adjustStock(tenantSlug, tenantId, item.id, delta);
      toast.success(`Stock ${type === "add" ? "added to" : "removed from"} "${item.name}"`);
      onOpenChange(false);
      setQty("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQty(""); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
            <p className="text-sm font-medium text-zinc-800">{item.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Current stock: <strong>{item.quantity}</strong></p>
          </div>

          <div className="space-y-2">
            <Label>Adjustment type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("add")}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                  type === "add"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                )}
              >
                + Add stock
              </button>
              <button
                type="button"
                onClick={() => setType("remove")}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                  type === "remove"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                )}
              >
                − Remove stock
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              max={type === "remove" ? item.quantity : undefined}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </div>

          {qty && Number(qty) > 0 && (
            <div className="flex justify-between rounded-lg bg-zinc-50 px-4 py-2.5 text-sm">
              <span className="text-zinc-500">New stock</span>
              <span className={cn("font-semibold", newQty < 0 ? "text-red-600" : "text-zinc-800")}>
                {Math.max(0, newQty)}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !qty || Number(qty) <= 0}>
            {saving ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
