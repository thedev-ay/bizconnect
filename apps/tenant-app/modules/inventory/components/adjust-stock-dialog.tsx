"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/use-online-status";
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
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [type, setType] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);

  const delta = type === "add" ? Number(qty) : -Number(qty);
  const newQty = item.quantity + delta;

  async function handleSave() {
    if (!isOnline) {
      toast.error("You're offline. Connect to the internet to adjust stock.");
      return;
    }
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
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQty(""); }}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(460px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Stock / Adjust</p>
              <DialogTitle className="mt-1 text-lg font-semibold tracking-tight text-foreground">Adjust stock</DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="rounded-2xl border border-border/60 bg-muted/35 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{item.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">On hand {item.quantity}</p>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("add")}
                className={cn(
                  "flex-1 rounded-2xl border py-2.5 text-sm font-medium transition-colors",
                  type === "add"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-border/70 text-muted-foreground hover:bg-muted/40"
                )}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setType("remove")}
                className={cn(
                  "flex-1 rounded-2xl border py-2.5 text-sm font-medium transition-colors",
                  type === "remove"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-border/70 text-muted-foreground hover:bg-muted/40"
                )}
              >
                Remove
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
            <div className="flex justify-between rounded-2xl border border-border/60 bg-muted/35 px-4 py-3 text-sm">
              <span className="text-muted-foreground">New stock</span>
              <span className={cn("font-semibold", newQty < 0 ? "text-red-700" : "text-foreground")}>
                {Math.max(0, newQty)}
              </span>
            </div>
          )}
        </div>
        <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-5 py-4">
          {!isOnline && (
            <p className="mr-auto flex items-center gap-1.5 text-xs text-amber-700">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </p>
          )}
          <Button variant="outline" className="rounded-full px-4" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full px-4" onClick={handleSave} disabled={saving || !qty || Number(qty) <= 0 || !isOnline}>
            {saving ? "Saving..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
