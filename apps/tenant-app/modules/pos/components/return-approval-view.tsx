"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertTriangle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { approveReturn, rejectReturn } from "../actions";

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface ReturnItem {
  id: string;
  quantity: number;
  itemId: string;
}

interface SaleData {
  id: string;
  referenceNo: string;
  createdAt: Date;
  total: string;
  items: SaleItem[];
}

interface ReturnRecord {
  id: string;
  saleId: string;
  status: string;
  reason: string;
  notes: string | null;
  refundAmount: string;
  createdAt: Date;
  sale: SaleData;
  items: ReturnItem[];
}

interface ReturnApprovalViewProps {
  returns: ReturnRecord[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
}

const REASON_LABELS: Record<string, string> = {
  damaged: "Damaged",
  defective: "Defective",
  wrong_item: "Wrong Item",
  customer_request: "Customer Request",
  quality_issue: "Quality Issue",
  other: "Other",
};

type ConfirmMode = { type: "approve" | "reject"; returnId: string } | null;

export function ReturnApprovalView({
  returns,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
}: ReturnApprovalViewProps) {
  const router = useRouter();
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [processing, setProcessing] = useState(false);
  const [expandedReturn, setExpandedReturn] = useState<string | null>(null);

  const pending = returns.filter((r) => r.status === "pending");
  const completed = returns.filter((r) => r.status !== "pending");

  const fmt = (v: string | number) =>
    `${currencySymbol}${Number(v).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`;

  async function handleApproveReturn() {
    if (!confirmMode || confirmMode.type !== "approve") return;

    setProcessing(true);
    try {
      await approveReturn(tenantSlug, tenantId, confirmMode.returnId);
      toast.success("Return approved");
      setConfirmMode(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve return"
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleRejectReturn() {
    if (!confirmMode || confirmMode.type !== "reject") return;

    setProcessing(true);
    try {
      await rejectReturn(tenantSlug, tenantId, confirmMode.returnId);
      toast.success("Return rejected");
      setConfirmMode(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject return"
      );
    } finally {
      setProcessing(false);
    }
  }

  if (pending.length === 0 && completed.length === 0) {
    return (
      <Card className="shadow-none border-zinc-200 p-12 text-center">
        <Clock className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">No returns yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Returns */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Pending Returns ({pending.length})
          </h2>
          <div className="grid gap-4">
            {pending.map((returnRecord) => (
              <Card
                key={returnRecord.id}
                className={cn(
                  "shadow-none border-2 p-5 transition-colors",
                  expandedReturn === returnRecord.id
                    ? "border-blue-200 bg-blue-50"
                    : "border-amber-100 bg-amber-50/50 hover:border-amber-200"
                )}
              >
                {/* Header */}
                <div
                  className="space-y-3 cursor-pointer"
                  onClick={() =>
                    setExpandedReturn(
                      expandedReturn === returnRecord.id ? null : returnRecord.id
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-sm font-medium text-zinc-800">
                          {returnRecord.sale.referenceNo}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          Pending
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(returnRecord.sale.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-zinc-800">
                        {fmt(returnRecord.refundAmount)}
                      </p>
                      <p className="text-xs text-zinc-500">refund</p>
                    </div>
                  </div>

                  {/* Reason badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/60 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                      {REASON_LABELS[returnRecord.reason] || returnRecord.reason}
                    </span>
                    {returnRecord.notes && (
                      <span className="text-xs text-zinc-600 italic">
                        "{returnRecord.notes}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {expandedReturn === returnRecord.id && (
                  <>
                    <Separator className="my-4 bg-amber-200" />

                    {/* Items being returned */}
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Items in return
                      </p>
                      <div className="space-y-1">
                        {returnRecord.items.map((item) => {
                          const saleItem = returnRecord.sale.items.find(
                            (si) => si.id === item.itemId
                          );
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/40"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-800">
                                  {saleItem?.name}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {item.quantity} × {saleItem ? fmt(saleItem.unitPrice) : "N/A"}
                                </p>
                              </div>
                              <p className="text-sm font-semibold tabular-nums text-zinc-800 shrink-0">
                                {saleItem ? fmt(saleItem.total) : "N/A"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() =>
                          setConfirmMode({
                            type: "reject",
                            returnId: returnRecord.id,
                          })
                        }
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() =>
                          setConfirmMode({
                            type: "approve",
                            returnId: returnRecord.id,
                          })
                        }
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Approve
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Returns */}
      {completed.length > 0 && pending.length > 0 && (
        <Separator className="my-6" />
      )}

      {completed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Completed Returns ({completed.length})
          </h2>
          <div className="grid gap-3">
            {completed.map((returnRecord) => (
              <Card
                key={returnRecord.id}
                className="shadow-none border-zinc-100 p-4 opacity-75 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-sm font-medium text-zinc-800">
                        {returnRecord.sale.referenceNo}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                          returnRecord.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-100 text-zinc-600"
                        )}
                      >
                        {returnRecord.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(returnRecord.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-zinc-800">
                    {fmt(returnRecord.refundAmount)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmMode} onOpenChange={() => setConfirmMode(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex max-w-sm flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
        >
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Returns / Confirm</p>
                <div className="mt-1 flex items-center gap-2">
                  {confirmMode?.type === "approve" ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                    {confirmMode?.type === "approve"
                      ? "Approve return?"
                      : "Reject return?"}
                  </DialogTitle>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmMode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 px-6 py-5">
            <div
              className={cn(
                "rounded-lg border p-3",
                confirmMode?.type === "approve"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              )}
            >
              <p
                className={cn(
                  "text-sm",
                  confirmMode?.type === "approve"
                    ? "text-emerald-900"
                    : "text-red-900"
                )}
              >
                {confirmMode?.type === "approve"
                  ? "Approving this return will restore the items to inventory and process the refund."
                  : "Rejecting this return will deny the refund request. Items will not be restored."}
              </p>
            </div>
            <p className="text-xs text-zinc-500">This action cannot be undone.</p>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmMode(null)}
              disabled={processing}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              variant={confirmMode?.type === "approve" ? "default" : "destructive"}
              onClick={
                confirmMode?.type === "approve"
                  ? handleApproveReturn
                  : handleRejectReturn
              }
              disabled={processing}
              className="rounded-full"
            >
              {processing
                ? "Processing..."
                : confirmMode?.type === "approve"
                  ? "Approve Return"
                  : "Reject Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
