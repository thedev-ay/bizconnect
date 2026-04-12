"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnlineStatus } from "@/lib/use-online-status";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const isOnline = useOnlineStatus();
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
    if (!isOnline) { toast.error("You're offline. Connect to update job orders."); return; }
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
    if (!isOnline) { toast.error("You're offline. Connect to update job orders."); return; }
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
    if (!isOnline) { toast.error("You're offline. Connect to update job orders."); return; }
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
    if (!isOnline) { toast.error("You're offline. Connect to create invoices."); return; }
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
        <DialogContent className="min-w-2xl border border-border/70 bg-popover/98 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <p className="eyebrow-label">Job Order</p>
                <DialogTitle className="font-mono">{jobOrder.jobNo}</DialogTitle>
                <DialogDescription>{jobOrder.customerName}</DialogDescription>
              </div>
              {canEdit && (
                <button
                  onClick={() => onEdit(jobOrder)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Inline confirmation */}
          {confirmMode && (
            <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/80">
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

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-1 rounded-2xl border border-border/60 bg-muted/35 px-4 py-3">
                  <p className="eyebrow-label text-[0.62rem]">Customer</p>
                  <p className="text-sm font-semibold text-foreground">{jobOrder.customerName}</p>
                  {jobOrder.contactNo && (
                    <p className="text-sm text-muted-foreground">{jobOrder.contactNo}</p>
                  )}
                  {jobOrder.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">{jobOrder.notes}</p>
                  )}
                </div>

                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/72 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Received</span>
                    <span>{format(new Date(jobOrder.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  {jobOrder.dueDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Due</span>
                      <span className={cn(new Date(jobOrder.dueDate) < new Date() && canEdit ? "font-medium text-red-500" : "text-foreground/80")}>
                        {format(new Date(jobOrder.dueDate), "MMM d")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold text-foreground">
                      {currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {jobOrder.assignedStaff.length > 0 && (
                    <div className="pt-1 text-xs text-muted-foreground">
                      Staff: {jobOrder.assignedStaff.map((s) => s.name).join(", ")}
                    </div>
                  )}
                </div>
              </div>

              {jobOrder.items.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services</p>
                  <div className="overflow-hidden rounded-2xl border border-border/60">
                    {jobOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-border/50 px-3 py-2 last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.weight != null
                              ? `${Number(item.weight)} kg × ${currencySymbol}${Number(item.unitPrice).toFixed(2)}/kg`
                              : `${item.quantity} pc × ${currencySymbol}${Number(item.unitPrice).toFixed(2)}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {currencySymbol}{Number(item.total).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">No services added.</p>
              )}

            </div>
          )}

          {/* Actions */}
          {!confirmMode && (
            <div className="flex items-center justify-between gap-2 pt-2">
              <div className="flex gap-2">
                {jobOrder.completedAt && !jobOrder.invoiceId && (
                  <Button size="sm" variant="outline" onClick={handleCreateInvoice} disabled={loading}>
                    Invoice
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
                    Cancel
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
                    Back
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
                    {loading ? "Updating..." : nextStage.name}
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
