"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Phone, ChevronRight, Search, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { JobOrder, LaundryStatus } from "../types";
import {
  STATUS_LABEL,
  STATUS_COLORS,
  NEXT_STATUS,
  NEXT_STATUS_LABEL,
} from "../types";
import { updateJobOrderStatus } from "../actions";
import { JobOrderDetailDialog } from "./job-order-detail-dialog";
import { EditJobOrderDialog } from "./edit-job-order-dialog";

interface ServiceOption {
  id: string;
  name: string;
  pricingType: "per_piece" | "per_kilo" | "flat";
  price: number;
  category: string | null;
}

interface JobOrderBoardProps {
  jobOrders: JobOrder[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
  services: ServiceOption[];
}

const TABS: { status: LaundryStatus; shortLabel: string }[] = [
  { status: "received", shortLabel: "Received" },
  { status: "washing",  shortLabel: "Washing" },
  { status: "drying",   shortLabel: "Drying" },
  { status: "folding",  shortLabel: "Folding" },
  { status: "ready",    shortLabel: "Ready" },
  { status: "claimed",  shortLabel: "Claimed" },
  { status: "cancelled", shortLabel: "Cancelled" },
];

const PRIORITY_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  low:    { dot: "bg-zinc-300",  badge: "", label: "" },
  normal: { dot: "bg-blue-400",  badge: "", label: "" },
  high:   { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "High" },
  urgent: { dot: "bg-red-500 animate-pulse", badge: "bg-red-100 text-red-700 border border-red-300", label: "Urgent" },
};

export function JobOrderBoard({
  jobOrders,
  tenantSlug,
  tenantId,
  currencySymbol,
  currencyLocale,
  services,
}: JobOrderBoardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LaundryStatus>("received");
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

  const countByStatus = (status: LaundryStatus) =>
    jobOrders.filter((j) => j.status === status).length;

  const visibleCards = jobOrders.filter(
    (j) => j.status === activeTab && matchesSearch(j)
  );

  async function handleAdvance(e: React.MouseEvent, jo: JobOrder) {
    e.stopPropagation();
    const next = NEXT_STATUS[jo.status as LaundryStatus];
    if (!next) return;
    setAdvancing(jo.id);
    try {
      await updateJobOrderStatus(tenantSlug, tenantId, jo.id, next);
      toast.success(`${jo.jobNo} → ${STATUS_LABEL[next]}`);
      router.refresh();
    } catch {
      toast.error("Failed to update");
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">

      {/* Tab bar + search row */}
      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {TABS.map(({ status, shortLabel }) => {
            const count = countByStatus(status);
            const isActive = activeTab === status;
            const isReady = status === "ready" && count > 0;

            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? isReady
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-zinc-900 text-white shadow-sm"
                    : isReady
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                )}
              >
                {shortLabel}
                {count > 0 && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                    isActive
                      ? "bg-white/20 text-white"
                      : isReady
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

        {/* Search */}
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

      {/* Card grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {visibleCards.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 text-center">
            {q ? (
              <>
                <Search className="h-6 w-6 text-zinc-200" />
                <p className="text-sm text-zinc-400">No matches for "{search}"</p>
              </>
            ) : activeTab === "claimed" ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-zinc-200" />
                <p className="text-sm text-zinc-400">No claimed orders yet</p>
              </>
            ) : activeTab === "cancelled" ? (
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
        ) : activeTab === "claimed" || activeTab === "cancelled" ? (
          /* Claimed / Cancelled — compact table list */
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
                  {jo.contactNo && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                      <Phone className="h-3 w-3" />
                      {jo.contactNo}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 shrink-0">
                    {activeTab === "claimed" && jo.claimedAt
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
              const nextStatus = NEXT_STATUS[jo.status as LaundryStatus];
              const priority = PRIORITY_STYLES[jo.priority] ?? PRIORITY_STYLES.normal;
              const isReady = jo.status === "ready";

              return (
                <div
                  key={jo.id}
                  onClick={() => setSelected(jo)}
                  className={cn(
                    "cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md flex flex-col gap-3",
                    jo.priority === "urgent"
                      ? "border-red-200 hover:border-red-300"
                      : isReady
                      ? "border-emerald-200 hover:border-emerald-300"
                      : "border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  {/* Top row: job no + priority */}
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
                    {jo.contactNo && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                        <Phone className="h-3 w-3 shrink-0" />
                        {jo.contactNo}
                      </div>
                    )}
                  </div>

                  {/* Services summary */}
                  <div className="flex-1">
                    {jo.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {jo.items.slice(0, 2).map((item) => (
                          <p key={item.id} className="truncate text-xs text-zinc-500">
                            {item.name}
                            {item.weight != null
                              ? ` · ${Number(item.weight)} kg`
                              : ` · ×${item.quantity}`}
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

                  {/* Footer: total + due date */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      {jo.dueDate && (
                        <p className={cn(
                          "text-[10px] font-medium",
                          isOverdue ? "text-red-500" : "text-zinc-400"
                        )}>
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
                  {nextStatus && (
                    <button
                      onClick={(e) => handleAdvance(e, jo)}
                      disabled={advancing === jo.id}
                      className={cn(
                        "flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                        jo.priority === "urgent"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : isReady
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
                      )}
                    >
                      {advancing === jo.id ? "Updating..." : NEXT_STATUS_LABEL[jo.status as LaundryStatus]}
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
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(null); }}
          onEdit={(jo) => { setSelected(null); setEditing(jo); }}
        />
      )}

      {editing && (
        <EditJobOrderDialog
          jobOrder={editing}
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          services={services}
          currencySymbol={currencySymbol}
          currencyLocale={currencyLocale}
          open={!!editing}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}
    </div>
  );
}
