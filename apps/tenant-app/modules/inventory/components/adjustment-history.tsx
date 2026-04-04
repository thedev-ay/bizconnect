"use client";

import { format } from "date-fns";
import { ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  manual: { label: "Manual Adjustment", color: "bg-blue-50 text-blue-700" },
  sale: { label: "Sale", color: "bg-emerald-50 text-emerald-700" },
  sale_void: { label: "Sale Voided", color: "bg-amber-50 text-amber-700" },
  damage: { label: "Damage", color: "bg-red-50 text-red-700" },
  recount: { label: "Recount", color: "bg-purple-50 text-purple-700" },
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
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Adjustment History</DialogTitle>
          <p className="text-sm text-zinc-500 mt-1">{itemName}</p>
        </DialogHeader>

        {adjustments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">No adjustments recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adjustments.map((adj) => {
              const info = reasonInfo(adj.reason);
              const isIncrease = adj.quantityChange > 0;

              return (
                <div
                  key={adj.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                      isIncrease ? "bg-emerald-100" : "bg-red-100"
                    )}
                  >
                    {isIncrease ? (
                      <ArrowUp className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-700" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded",
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
                      <p className="text-xs text-zinc-600 mb-0.5">{adj.notes}</p>
                    )}

                    <p className="text-xs text-zinc-400">
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
