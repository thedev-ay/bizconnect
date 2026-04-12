"use client";

import { format } from "date-fns";
import { ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Adjustment {
  id: string;
  quantityChange: number;
  reason: string;
  notes: string | null;
  createdAt: Date;
}

interface AdjustmentHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  adjustments: Adjustment[];
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  manual: { label: "Manual", color: "bg-sky-50 text-sky-700" },
  sale: { label: "Sale", color: "bg-emerald-50 text-emerald-700" },
  sale_void: { label: "Void", color: "bg-amber-50 text-amber-700" },
  damage: { label: "Damage", color: "bg-red-50 text-red-700" },
  recount: { label: "Recount", color: "bg-cyan-50 text-cyan-700" },
  waste: { label: "Waste", color: "bg-orange-50 text-orange-700" },
};

export function AdjustmentHistory({
  open,
  onOpenChange,
  itemName,
  adjustments,
}: AdjustmentHistoryProps) {
  const reasonInfo = (reason: string) =>
    REASON_LABELS[reason] || {
      label: reason.charAt(0).toUpperCase() + reason.slice(1),
      color: "bg-zinc-50 text-zinc-700",
    };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto border border-border/70 bg-popover/98 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label">History</p>
          <DialogTitle>Adjustments</DialogTitle>
          <DialogDescription>{itemName}</DialogDescription>
        </DialogHeader>

        {adjustments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No adjustments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adjustments.map((adj) => {
              const info = reasonInfo(adj.reason);
              const isIncrease = adj.quantityChange > 0;

              return (
                <div
                  key={adj.id}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/72 p-3"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                      isIncrease ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}
                  >
                    {isIncrease ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          info.color
                        )}
                      >
                        {info.label}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          isIncrease ? "text-emerald-700" : "text-red-700"
                        )}
                      >
                        {isIncrease ? "+" : ""}{adj.quantityChange}
                      </span>
                    </div>

                    {adj.notes && (
                      <p className="mb-0.5 text-xs text-foreground/75">{adj.notes}</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {format(new Date(adj.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
