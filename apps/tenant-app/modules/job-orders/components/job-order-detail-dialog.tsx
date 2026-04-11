"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Pencil, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOrder, WorkflowStage } from "../types";
import { getNextStage, getPrevStage } from "../types";
import {
  createInvoiceForJobOrder,
  updateJobOrderStatus,
  deleteJobOrder,
} from "../actions";

interface JobOrderDetailDialogProps {
  jobOrder: JobOrder;
  stages: WorkflowStage[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (jobOrder: JobOrder) => void;
  onClaim: (jobOrder: JobOrder) => void;
  billingEnabled: boolean;
}

type ConfirmMode = "cancel" | "delete" | null;

export function JobOrderDetailDialog({
  jobOrder,
  stages,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
  onEdit,
  onClaim,
  billingEnabled,
}: JobOrderDetailDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);

  const currentStage = stages.find((s) => s.slug === jobOrder.status);
  const nextStage = getNextStage(stages, jobOrder.status);
  const prevStage = getPrevStage(stages, jobOrder.status);
  const grandTotal = jobOrder.items.reduce((sum, i) => sum + Number(i.total), 0);
  const canEdit = currentStage?.type === "active";
  const cancelledStage = stages.find((s) => s.type === "cancelled");

  function handleOpenChange(o: boolean) {
    if (!o) setConfirmMode(null);
    onOpenChange(o);
  }

  function handleAdvance() {
    if (!nextStage) return;
    // Intercept final step — delegate to payment dialog
    if (nextStage.type === "completed") {
      onOpenChange(false);
      onClaim(jobOrder);
      return;
    }
    setLoading(true);
    updateJobOrderStatus(tenantSlug, tenantId, jobOrder.id, nextStage.slug, nextStage.type)
      .then(() => { toast.success(`Moved to ${nextStage.name}`); onOpenChange(false); queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] }); })
      .catch(() => toast.error("Failed to update status"))
      .finally(() => setLoading(false));
  }

  async function handleMoveBack() {
    if (!prevStage) return;
    setLoading(true);
    try {
      await updateJobOrderStatus(tenantSlug, tenantId, jobOrder.id, prevStage.slug, prevStage.type);
      toast.success(`Moved back to ${prevStage.name}`);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch {
      toast.error("Failed to move back");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      if (confirmMode === "cancel" && cancelledStage) {
        await updateJobOrderStatus(tenantSlug, tenantId, jobOrder.id, cancelledStage.slug, "cancelled");
        toast.success("Job order cancelled");
      } else if (confirmMode === "delete") {
        await deleteJobOrder(tenantSlug, tenantId, jobOrder.id);
        toast.success("Job order deleted");
      }
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
      setConfirmMode(null);
    }
  }

  async function handleCreateInvoice() {
    setLoading(true);
    try {
      const result = await createInvoiceForJobOrder(tenantSlug, tenantId, jobOrder.id);
      toast.success("Draft invoice created");
      onOpenChange(false);
      if (billingEnabled && result?.invoiceId) {
        router.push(`/${tenantSlug}/billing?invoiceId=${result.invoiceId}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="min-w-2xl">
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
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                  {currentStage?.name ?? jobOrder.status}
                </span>
                {currentStage?.type === "completed" && (
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    !jobOrder.invoiceId && "bg-amber-50 text-amber-700 border-amber-200",
                    jobOrder.invoiceStatus === "draft" && "bg-zinc-100 text-zinc-600 border-zinc-200",
                    jobOrder.invoiceStatus === "sent" && "bg-blue-50 text-blue-700 border-blue-200",
                    jobOrder.invoiceStatus === "paid" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                    jobOrder.invoiceStatus === "void" && "bg-zinc-100 text-zinc-400 border-zinc-200",
                  )}>
                    {!jobOrder.invoiceId ? "Uninvoiced" : jobOrder.invoiceStatus === "void" ? "Voided" : jobOrder.invoiceStatus}
                  </span>
                )}
                {jobOrder.priority !== "normal" && (
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
                    jobOrder.priority === "urgent" && "bg-red-100 text-red-700 border-red-300",
                    jobOrder.priority === "high"   && "bg-amber-50 text-amber-700 border-amber-200",
                    jobOrder.priority === "low"    && "bg-zinc-100 text-zinc-500 border-zinc-200",
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
                  {jobOrder.assignedStaff.length > 0 && (
                    <span>Staff: {jobOrder.assignedStaff.map((s) => s.name).join(", ")}</span>
                  )}
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
                {jobOrder.completedAt && !jobOrder.invoiceId && (
                  <Button size="sm" variant="outline" onClick={handleCreateInvoice} disabled={loading}>
                    Create Invoice
                  </Button>
                )}
                {canEdit && cancelledStage && (
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
              <div className="flex items-center gap-2 ml-auto">
                {prevStage && canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMoveBack}
                    disabled={loading}
                    className="gap-1 text-zinc-500"
                    title={`Move back to ${prevStage.name}`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {prevStage.name}
                  </Button>
                )}
                {nextStage && (
                  <Button
                    onClick={handleAdvance}
                    disabled={loading}
                    className={cn(
                      nextStage.type === "completed" && "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {loading ? "Updating..." : `Move to ${nextStage.name}`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
