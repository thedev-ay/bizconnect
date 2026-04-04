"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Phone, ChevronRight, Search, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { JobOrder, WorkflowStage } from "../types";
import { getNextStage, getStageColors } from "../types";
import { createInvoiceForJobOrder, updateJobOrderStatus } from "../actions";
import { JobOrderDetailDialog } from "./job-order-detail-dialog";
import { EditJobOrderDialog } from "./edit-job-order-dialog";

interface ServiceOption {
  id: string;
  name: string;
  pricingType: "per_piece" | "per_kilo" | "flat";
  price: number;
  category: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface JobOrderBoardProps {
  jobOrders: JobOrder[];
  stages: WorkflowStage[];
  tenantSlug: string;
  tenantId: string;
  tenantName: string;
  currencySymbol: string;
  currencyLocale: string;
  services: ServiceOption[];
  customers: CustomerOption[];
  billingEnabled: boolean;
}

const PRIORITY_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  low:    { dot: "bg-zinc-300",  badge: "", label: "" },
  normal: { dot: "bg-blue-400",  badge: "", label: "" },
  high:   { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "High" },
  urgent: { dot: "bg-red-500 animate-pulse", badge: "bg-red-100 text-red-700 border border-red-300", label: "Urgent" },
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  void: "bg-zinc-100 text-zinc-400 border-zinc-200",
};

function getBillingBadge(jobOrder: JobOrder) {
  if (!jobOrder.invoiceId) {
    return {
      label: "Uninvoiced",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: jobOrder.invoiceStatus === "void" ? "Voided" : jobOrder.invoiceStatus ?? "Invoiced",
    className: INVOICE_STATUS_STYLES[jobOrder.invoiceStatus ?? ""] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
}

export function JobOrderBoard({
  jobOrders,
  stages,
  tenantSlug,
  tenantId,
  tenantName,
  currencySymbol,
  currencyLocale,
  services,
  customers,
  billingEnabled,
}: JobOrderBoardProps) {
  const router = useRouter();
  const firstStage = stages[0];
  const [activeTab, setActiveTab] = useState<string>(firstStage?.slug ?? "");
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobOrder | null>(null);
  const [editing, setEditing] = useState<JobOrder | null>(null);
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();
  function matchesSearch(jo: JobOrder) {
    if (!q) return true;
    return (
      jo.customerName.toLowerCase().includes(q) ||
      jo.jobNo.toLowerCase().includes(q) ||
      (jo.contactNo?.toLowerCase().includes(q) ?? false)
    );
  }

  const visibleCards = jobOrders.filter(
    (j) => j.status === activeTab && matchesSearch(j)
  );

  const activeStage = stages.find((s) => s.slug === activeTab);
  const isCompletedTab = activeStage?.type === "completed";
  const isCancelledTab = activeStage?.type === "cancelled";
  const isListTab = isCompletedTab || isCancelledTab;

  async function handleAdvance(e: React.MouseEvent, jo: JobOrder) {
    e.stopPropagation();
    const next = getNextStage(stages, jo.status);
    if (!next) return;

    setAdvancing(jo.id);
    try {
      await updateJobOrderStatus(tenantSlug, tenantId, jo.id, next.slug, next.type);
      toast.success(`${jo.jobNo} → ${next.name}`);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setAdvancing(null);
    }
  }

  async function handleCreateInvoice(jobOrderId: string) {
    setAdvancing(jobOrderId);
    try {
      const result = await createInvoiceForJobOrder(tenantSlug, tenantId, jobOrderId);
      toast.success("Draft invoice created");
      if (billingEnabled && result?.invoiceId) {
        router.push(`/${tenantSlug}/billing?invoiceId=${result.invoiceId}`);
        return;
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">

      {/* Tab bar + search */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {stages.map((stage) => {
            const count = jobOrders.filter((j) => j.status === stage.slug).length;
            const isActive = activeTab === stage.slug;
            const isReadyStage = stage.type === "active" &&
              getNextStage(stages, stage.slug)?.type === "completed";

            return (
              <button
                key={stage.slug}
                onClick={() => setActiveTab(stage.slug)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? isReadyStage
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-zinc-900 text-white shadow-sm"
                    : isReadyStage && count > 0
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                )}
              >
                {stage.name}
                {count > 0 && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                    isActive
                      ? "bg-white/20 text-white"
                      : isReadyStage && count > 0
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-zinc-200 text-zinc-600"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0 w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Name, job no, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {visibleCards.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 text-center">
            {q ? (
              <>
                <Search className="h-6 w-6 text-zinc-200" />
                <p className="text-sm text-zinc-400">No matches for "{search}"</p>
              </>
            ) : isCompletedTab ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-zinc-200" />
                <p className="text-sm text-zinc-400">No completed orders yet</p>
              </>
            ) : isCancelledTab ? (
              <>
                <XCircle className="h-6 w-6 text-zinc-200" />
                <p className="text-sm text-zinc-400">No cancelled orders</p>
              </>
            ) : (
              <>
                <Clock className="h-6 w-6 text-zinc-200" />
                <p className="text-sm text-zinc-400">No orders in this stage</p>
              </>
            )}
          </div>
        ) : isListTab ? (
          /* Completed / Cancelled — compact list */
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="divide-y divide-zinc-100">
              {visibleCards.map((jo) => (
                <div
                  key={jo.id}
                  onClick={() => setSelected(jo)}
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <span className="font-mono text-xs font-semibold text-zinc-400 shrink-0">{jo.jobNo}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{jo.customerName}</span>
                  {isCompletedTab && (() => {
                    const badge = getBillingBadge(jo);
                    return (
                      <span
                        className={cn(
                          "rounded-full border px-2 py-1 text-[10px] font-semibold capitalize",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                  {!jo.invoiceId && isCompletedTab && (
                    <button
                      type="button"
                      className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCreateInvoice(jo.id);
                      }}
                    >
                      Create Invoice
                    </button>
                  )}
                  {jo.contactNo && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                      <Phone className="h-3 w-3" />
                      {jo.contactNo}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 shrink-0">
                    {isCompletedTab && jo.claimedAt
                      ? format(new Date(jo.claimedAt), "MMM d, h:mm a")
                      : format(new Date(jo.createdAt), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Active stages — card grid */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-4">
            {visibleCards.map((jo) => {
              const isOverdue = jo.dueDate && new Date(jo.dueDate) < new Date();
              const grandTotal = jo.items.reduce((s, i) => s + Number(i.total), 0);
              const nextStage = getNextStage(stages, jo.status);
              const isReadyForCompletion = nextStage?.type === "completed";
              const priority = PRIORITY_STYLES[jo.priority] ?? PRIORITY_STYLES.normal;
              const stageColors = getStageColors(activeStage?.color ?? "zinc");

              return (
                <div
                  key={jo.id}
                  onClick={() => setSelected(jo)}
                  className={cn(
                    "cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md flex flex-col gap-3",
                    jo.priority === "urgent"
                      ? "border-red-200 hover:border-red-300"
                      : isReadyForCompletion
                      ? "border-emerald-200 hover:border-emerald-300"
                      : stageColors.card
                  )}
                >
                  {/* Top: job no + priority */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-zinc-400">{jo.jobNo}</span>
                    {priority.badge ? (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", priority.badge)}>
                        {priority.label}
                      </span>
                    ) : (
                      <span className={cn("h-2 w-2 rounded-full shrink-0", priority.dot)} />
                    )}
                  </div>

                  {/* Customer */}
                <div>
                  <p className="text-sm font-bold text-zinc-900 leading-tight">{jo.customerName}</p>
                  {jo.invoiceStatus && (
                    <span
                      className={cn(
                        "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                        INVOICE_STATUS_STYLES[jo.invoiceStatus] ?? "bg-zinc-100 text-zinc-600 border-zinc-200"
                      )}
                    >
                      Invoice {jo.invoiceStatus}
                    </span>
                  )}
                  {jo.contactNo && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        {jo.contactNo}
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  <div className="flex-1">
                    {jo.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {jo.items.slice(0, 2).map((item) => (
                          <p key={item.id} className="truncate text-xs text-zinc-500">
                            {item.name}
                            {item.weight != null ? ` · ${Number(item.weight)} kg` : ` · ×${item.quantity}`}
                          </p>
                        ))}
                        {jo.items.length > 2 && (
                          <p className="text-xs text-zinc-400">+{jo.items.length - 2} more</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs italic text-zinc-300">No services added</p>
                    )}
                  </div>

                  {/* Footer: dates + total */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      {jo.dueDate && (
                        <p className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-zinc-400")}>
                          Due {format(new Date(jo.dueDate), "MMM d")}
                          {isOverdue && " · overdue"}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400">
                        {format(new Date(jo.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    {grandTotal > 0 && (
                      <p className="text-sm font-bold text-zinc-800 tabular-nums shrink-0">
                        {currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {/* Advance button */}
                  {nextStage && (
                    <button
                      onClick={(e) => handleAdvance(e, jo)}
                      disabled={advancing === jo.id}
                      className={cn(
                        "flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                        jo.priority === "urgent"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : isReadyForCompletion
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : getStageColors(nextStage.color).btn
                      )}
                    >
                      {advancing === jo.id ? "Updating..." : `Move to ${nextStage.name}`}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <JobOrderDetailDialog
          jobOrder={selected}
          stages={stages}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          tenantName={tenantName}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(null); }}
          onEdit={(jo) => { setSelected(null); setEditing(jo); }}
          billingEnabled={billingEnabled}
        />
      )}

      {editing && (
        <EditJobOrderDialog
          jobOrder={editing}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          services={services}
          customers={customers}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}
    </div>
  );
}
