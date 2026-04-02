"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOrder, LaundryStatus } from "../types";
import { STATUS_LABEL, STATUS_COLORS, NEXT_STATUS, NEXT_STATUS_LABEL } from "../types";
import { updateJobOrderStatus, deleteJobOrder } from "../actions";

interface JobOrderDetailDialogProps {
  jobOrder: JobOrder;
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (jobOrder: JobOrder) => void;
}

type ConfirmMode = "cancel" | "delete" | null;

export function JobOrderDetailDialog({
  jobOrder,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
  onEdit,
}: JobOrderDetailDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);

  const status = jobOrder.status as LaundryStatus;
  const nextStatus = NEXT_STATUS[status];
  const nextLabel = NEXT_STATUS_LABEL[status];
  const grandTotal = jobOrder.items.reduce((sum, i) => sum + Number(i.total), 0);
  const canEdit = status !== "claimed" && status !== "cancelled";

  function handleOpenChange(o: boolean) {
    if (!o) setConfirmMode(null);
    onOpenChange(o);
  }

  async function handleAdvance() {
    if (!nextStatus) return;
    setLoading(true);
    try {
      await updateJobOrderStatus(tenantSlug, tenantId, jobOrder.id, nextStatus);
      toast.success(`Moved to ${STATUS_LABEL[nextStatus]}`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      if (confirmMode === "cancel") {
        await updateJobOrderStatus(tenantSlug, tenantId, jobOrder.id, "cancelled");
        toast.success("Job order cancelled");
      } else if (confirmMode === "delete") {
        await deleteJobOrder(tenantSlug, tenantId, jobOrder.id);
        toast.success("Job order deleted");
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
      setConfirmMode(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="font-mono">{jobOrder.jobNo}</DialogTitle>
              {canEdit && (
                <button
                  onClick={() => onEdit(jobOrder)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Inline confirmation */}
          {confirmMode && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-3">
              <p className="text-sm font-medium text-red-700">
                {confirmMode === "cancel"
                  ? "Cancel this job order? This cannot be undone."
                  : `Permanently delete ${jobOrder.jobNo}? This cannot be undone.`}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmMode(null)} disabled={loading}>
                  No, go back
                </Button>
                <Button size="sm" variant="destructive" onClick={handleConfirm} disabled={loading}>
                  {loading ? "..." : confirmMode === "cancel" ? "Yes, cancel order" : "Yes, delete"}
                </Button>
              </div>
            </div>
          )}

          {!confirmMode && (
            <div className="space-y-4">
              {/* Status + priority */}
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  STATUS_COLORS[status]?.pill
                )}>
                  {STATUS_LABEL[status] ?? status}
                </span>
                {jobOrder.priority !== "normal" && (
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                    jobOrder.priority === "urgent" && "bg-red-100 text-red-700 border-red-300",
                    jobOrder.priority === "high" && "bg-amber-50 text-amber-700 border-amber-200",
                    jobOrder.priority === "low" && "bg-zinc-100 text-zinc-500 border-zinc-200",
                  )}>
                    {jobOrder.priority}
                  </span>
                )}
              </div>

              {/* Customer info */}
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-zinc-800">{jobOrder.customerName}</p>
                {jobOrder.contactNo && (
                  <p className="text-sm text-zinc-500">{jobOrder.contactNo}</p>
                )}
                {jobOrder.notes && (
                  <p className="text-xs text-zinc-400 mt-1">{jobOrder.notes}</p>
                )}
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-zinc-400">
                  <span>Received: {format(new Date(jobOrder.createdAt), "MMM d, h:mm a")}</span>
                  {jobOrder.dueDate && (
                    <span className={new Date(jobOrder.dueDate) < new Date() && canEdit ? "text-red-500 font-medium" : ""}>
                      Due: {format(new Date(jobOrder.dueDate), "MMM d")}
                    </span>
                  )}
                  {jobOrder.assignedTo && <span>Staff: {jobOrder.assignedTo}</span>}
                </div>
              </div>

              {/* Items */}
              {jobOrder.items.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Services</p>
                  <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
                    {jobOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                          <p className="text-xs text-zinc-400">
                            {item.weight != null
                              ? `${Number(item.weight)} kg × ${currencySymbol}${Number(item.unitPrice).toFixed(2)}/kg`
                              : `${item.quantity} pc × ${currencySymbol}${Number(item.unitPrice).toFixed(2)}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-zinc-800">
                          {currencySymbol}{Number(item.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between px-1 font-bold text-zinc-900">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">No services added.</p>
              )}
            </div>
          )}

          {/* Actions */}
          {!confirmMode && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive border-destructive/30"
                    onClick={() => setConfirmMode("cancel")}
                    disabled={loading}
                  >
                    Cancel Order
                  </Button>
                )}
                {!canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive border-destructive/30"
                    onClick={() => setConfirmMode("delete")}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                )}
              </div>
              {nextStatus && (
                <Button onClick={handleAdvance} disabled={loading} className="ml-auto">
                  {loading ? "Updating..." : nextLabel}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
