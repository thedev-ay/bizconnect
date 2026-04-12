"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Phone, ChevronRight, Search, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { JobOrder, WorkflowStage } from "../types";
import { getNextStage } from "../types";
import { createInvoiceForJobOrder, updateJobOrderStatus } from "../actions";
import { JobOrderDetailDialog } from "./job-order-detail-dialog";
import { EditJobOrderDialog } from "./edit-job-order-dialog";
import { ClaimPaymentDialog } from "./claim-payment-dialog";
import { KanbanBoard } from "./kanban-board";

const MIN_COL_WIDTH = 240;

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

interface EmployeeOption {
  id: string;
  name: string;
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
  employees: EmployeeOption[];
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
  employees,
  billingEnabled,
}: JobOrderBoardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const firstStage = stages[0];
  const [activeTab, setActiveTab] = useState<string>(firstStage?.slug ?? "");
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobOrder | null>(null);
  const [editing, setEditing] = useState<JobOrder | null>(null);
  const [claiming, setClaiming] = useState<JobOrder | null>(null);
  const [search, setSearch] = useState("");
  const [useKanban, setUseKanban] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeStageCount = stages.filter((s) => s.type === "active").length;

  useEffect(() => {
    if (!stages.length) return;
    if (activeTab && stages.some((stage) => stage.slug === activeTab)) return;
    const firstActiveStage = stages.find((stage) => stage.type === "active") ?? stages[0];
    setActiveTab(firstActiveStage?.slug ?? "");
  }, [stages, activeTab]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setUseKanban(window.innerWidth >= 1024 && entry.contentRect.width >= activeStageCount * MIN_COL_WIDTH);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeStageCount]);

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

  function handleAdvance(e: React.MouseEvent, jo: JobOrder) {
    e.stopPropagation();
    const next = getNextStage(stages, jo.status);
    if (!next) return;

    // Intercept final step — open payment dialog instead of advancing directly
    if (next.type === "completed") {
      setSelected(null);
      setClaiming(jo);
      return;
    }

    setAdvancing(jo.id);
    updateJobOrderStatus(tenantSlug, tenantId, jo.id, next.slug, next.type)
      .then(() => { toast.success(`${jo.jobNo} → ${next.name}`); queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] }); })
      .catch(() => toast.error("Failed to update"))
      .finally(() => setAdvancing(null));
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
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {!useKanban && (
          <div className="flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-[22px] border border-border/60 bg-muted/25 p-1 sm:flex-1 sm:rounded-full">
            {stages.map((stage) => {
              const count = jobOrders.filter((j) => j.status === stage.slug).length;
              const isActive = activeTab === stage.slug;

              return (
                <button
                  key={stage.slug}
                  onClick={() => setActiveTab(stage.slug)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-foreground text-background shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]"
                      : "text-muted-foreground hover:bg-background hover:text-foreground"
                  )}
                >
                  {stage.name}
                  {count > 0 && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
                      isActive ? "bg-white/20 text-white" : "bg-muted text-foreground/70"
                      )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className={cn("relative shrink-0", useKanban ? "w-full sm:w-72" : "w-full sm:w-56")}>
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Name, job no, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-full border-border/70 bg-background/75 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Kanban board — shown when screen fits all columns */}
      {useKanban && (
        <div className="flex-1 min-h-0">
          <KanbanBoard
            jobOrders={jobOrders.filter(matchesSearch)}
            stages={stages}
            tenantSlug={tenantSlug}
            tenantId={tenantId}
            onSelect={setSelected}
            onEdit={setEditing}
            onClaim={setClaiming}
          />
        </div>
      )}

      {/* Mobile / narrow widths use selected-stage lists instead of desktop kanban */}
      {!useKanban && <div className="flex-1 min-h-0 overflow-y-auto">
        {visibleCards.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed border-border/70 text-center">
            {q ? (
              <>
                <Search className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No matches</p>
              </>
            ) : isCompletedTab ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No completed orders</p>
              </>
            ) : isCancelledTab ? (
              <>
                <XCircle className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No cancelled orders</p>
              </>
            ) : (
              <>
                <Clock className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No orders in this stage</p>
              </>
            )}
          </div>
        ) : isListTab ? (
          <div className="overflow-hidden rounded-[28px] border border-border/60 bg-background/72">
            <div className="divide-y divide-border/50">
              {visibleCards.map((jo) => (
                <div
                  key={jo.id}
                  onClick={() => setSelected(jo)}
                  className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  <span className="shrink-0 font-mono text-xs font-semibold text-muted-foreground">{jo.jobNo}</span>
                  <span className="flex-1 truncate text-sm font-medium text-foreground">{jo.customerName}</span>
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
                      className="rounded-full border border-border/70 px-2 py-1 text-[10px] font-semibold text-foreground/75 hover:bg-muted/30"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCreateInvoice(jo.id);
                      }}
                    >
                      Create Invoice
                    </button>
                  )}
                  {jo.contactNo && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                      <Phone className="h-3 w-3" />
                      {jo.contactNo}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isCompletedTab && jo.claimedAt
                      ? format(new Date(jo.claimedAt), "MMM d, h:mm a")
                      : format(new Date(jo.createdAt), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3 pb-4">
            {visibleCards.map((jo) => {
              const isOverdue = jo.dueDate && new Date(jo.dueDate) < new Date();
              const grandTotal = jo.items.reduce((s, i) => s + Number(i.total), 0);
              const nextStage = getNextStage(stages, jo.status);
              const isReadyForCompletion = nextStage?.type === "completed";
              const priority = PRIORITY_STYLES[jo.priority] ?? PRIORITY_STYLES.normal;

              return (
                <div
                  key={jo.id}
                  onClick={() => setSelected(jo)}
                  className={cn(
                    "flex cursor-pointer flex-col gap-3 rounded-[26px] border bg-background/78 p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.34)]",
                    jo.priority === "urgent"
                      ? "border-red-200 hover:border-red-300"
                      : "border-border/60 hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">{jo.jobNo}</span>
                    {priority.badge ? (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", priority.badge)}>
                        {priority.label}
                      </span>
                    ) : (
                      <span className={cn("h-2 w-2 rounded-full shrink-0", priority.dot)} />
                    )}
                  </div>

                <div>
                  <p className="text-sm font-bold leading-tight text-foreground">{jo.customerName}</p>
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
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        {jo.contactNo}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    {jo.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {jo.items.slice(0, 2).map((item) => (
                          <p key={item.id} className="truncate text-xs text-muted-foreground">
                            {item.name}
                            {item.weight != null ? ` · ${Number(item.weight)} kg` : ` · ×${item.quantity}`}
                          </p>
                        ))}
                        {jo.items.length > 2 && (
                          <p className="text-xs text-muted-foreground">+{jo.items.length - 2} more</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/60">No services</p>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div>
                      {jo.dueDate && (
                        <p className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                          Due {format(new Date(jo.dueDate), "MMM d")}
                          {isOverdue && " · overdue"}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(jo.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    {grandTotal > 0 && (
                      <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                        {currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  {nextStage && (
                    <button
                      onClick={(e) => handleAdvance(e, jo)}
                      disabled={advancing === jo.id}
                      className={cn(
                        "flex w-full items-center justify-center gap-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50",
                        jo.priority === "urgent"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : isReadyForCompletion
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
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
      </div>}

      {selected && (
        <JobOrderDetailDialog
          jobOrder={selected}
          stages={stages}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(null); }}
          onEdit={(jo) => { setSelected(null); setEditing(jo); }}
          onClaim={(jo) => { setSelected(null); setClaiming(jo); }}
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
          employees={employees}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}

      {claiming && (
        <ClaimPaymentDialog
          jobOrder={claiming}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          tenantName={tenantName}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!claiming}
          onOpenChange={(o) => { if (!o) setClaiming(null); }}
        />
      )}
    </div>
  );
}
