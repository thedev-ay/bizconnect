"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useDraggable,
  useDroppable,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Phone, ChevronRight, Clock, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOrder, WorkflowStage } from "../types";
import { updateJobOrderStatus } from "../actions";

const PRIORITY_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  low:    { dot: "bg-zinc-300",  badge: "", label: "" },
  normal: { dot: "bg-blue-400",  badge: "", label: "" },
  high:   { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "High" },
  urgent: { dot: "bg-red-500 animate-pulse", badge: "bg-red-100 text-red-700 border border-red-300", label: "Urgent" },
};

interface KanbanCardProps {
  jobOrder: JobOrder;
  stages: WorkflowStage[];
  currencySymbol: string;
  currencyLocale: string;
  onSelect: (jo: JobOrder) => void;
  onEdit: (jo: JobOrder) => void;
  onAdvance: (jo: JobOrder) => void;
  advancing: string | null;
  overlay?: boolean;
}

function KanbanCard({ jobOrder: jo, stages, currencySymbol, currencyLocale, onSelect, onEdit, onAdvance, advancing, overlay }: KanbanCardProps) {
  const stage = stages.find((s) => s.slug === jo.status);
  const isTerminal = stage?.type === "completed" || stage?.type === "cancelled";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: jo.id,
    disabled: isTerminal || overlay,
  });

  const isOverdue = jo.dueDate && new Date(jo.dueDate) < new Date();
  const grandTotal = jo.items.reduce((s, i) => s + Number(i.total), 0);
  const nextStage = (() => {
    if (isTerminal) return null;
    const activeStages = stages.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = activeStages.findIndex((s) => s.slug === jo.status);
    if (idx === -1) return null;
    if (idx < activeStages.length - 1) return activeStages[idx + 1];
    return stages.find((s) => s.type === "completed") ?? null;
  })();
  const isReadyForCompletion = nextStage?.type === "completed";
  const priority = PRIORITY_STYLES[jo.priority] ?? PRIORITY_STYLES.normal;

  if (isDragging && !overlay) {
    return (
      <div
        ref={setNodeRef}
        className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 h-24"
      />
    );
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : { transform: CSS.Transform.toString(transform) }}
      className={cn(
        "rounded-xl border bg-white p-3.5 shadow-sm flex flex-col gap-2.5 select-none",
        overlay
          ? "shadow-xl rotate-1 cursor-grabbing"
          : isTerminal
          ? "cursor-pointer hover:shadow-md transition-shadow"
          : "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
        jo.priority === "urgent" ? "border-red-200" : "border-zinc-200"
      )}
      {...(!overlay && !isTerminal ? { ...attributes, ...listeners } : {})}
      onClick={(e) => {
        if (!overlay) { e.stopPropagation(); onSelect(jo); }
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-zinc-400">{jo.jobNo}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {priority.badge ? (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", priority.badge)}>
              {priority.label}
            </span>
          ) : (
            <span className={cn("h-2 w-2 rounded-full", priority.dot)} />
          )}
          {!isTerminal && !overlay && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(jo); }}
              className="rounded p-0.5 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
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

      {/* Services */}
      {jo.items.length > 0 && (
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
      )}

      {/* Assigned staff */}
      {jo.assignedStaff.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {jo.assignedStaff.slice(0, 3).map((s) => (
            <span key={s.employeeId} className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
              {s.name.split(" ")[0]}
            </span>
          ))}
          {jo.assignedStaff.length > 3 && (
            <span className="text-[10px] text-zinc-400">+{jo.assignedStaff.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between gap-2">
        <div>
          {jo.dueDate && (
            <p className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-zinc-400")}>
              Due {format(new Date(jo.dueDate), "MMM d")}
              {isOverdue && " · overdue"}
            </p>
          )}
          <p className="text-xs text-zinc-400">{format(new Date(jo.createdAt), "MMM d, h:mm a")}</p>
        </div>
        {grandTotal > 0 && (
          <p className="text-sm font-bold text-zinc-800 tabular-nums shrink-0">
            {currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Advance button — hidden during drag overlay */}
      {!overlay && nextStage && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onAdvance(jo); }}
          disabled={advancing === jo.id}
          className={cn(
            "flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
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
}

interface KanbanColumnProps {
  stage: WorkflowStage;
  cards: JobOrder[];
  stages: WorkflowStage[];
  currencySymbol: string;
  currencyLocale: string;
  onSelect: (jo: JobOrder) => void;
  onEdit: (jo: JobOrder) => void;
  onAdvance: (jo: JobOrder) => void;
  advancing: string | null;
  isOver: boolean;
}

function KanbanColumn({ stage, cards, stages, currencySymbol, currencyLocale, onSelect, onEdit, onAdvance, advancing, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.slug });

  const isTerminal = stage.type === "completed" || stage.type === "cancelled";
  const headerClass = stage.type === "completed"
    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
    : stage.type === "cancelled"
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-zinc-100 text-zinc-700 border-zinc-200";
  const dropZoneClass = isOver
    ? stage.type === "completed"
      ? "bg-emerald-50 border-emerald-300"
      : stage.type === "cancelled"
      ? "bg-red-50 border-red-300"
      : "bg-zinc-100 border-zinc-300"
    : isTerminal
    ? "bg-white border-zinc-200 opacity-80"
    : "bg-zinc-50 border-zinc-200";

  return (
    <div className="flex flex-col min-w-0 flex-1 min-w-[220px]">
      <div className={cn(
        "flex items-center justify-between rounded-t-xl px-3 py-2 border border-b-0",
        headerClass
      )}>
        <span className="text-xs font-bold truncate">{stage.name}</span>
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none ml-1 shrink-0",
          headerClass
        )}>
          {cards.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-xl border border-t-0 p-2 space-y-2 min-h-[120px] transition-colors",
          dropZoneClass
        )}
      >
        {cards.length === 0 && !isOver && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-zinc-300 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Empty
            </p>
          </div>
        )}
        {cards.map((jo) => (
          <KanbanCard
            key={jo.id}
            jobOrder={jo}
            stages={stages}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
            onSelect={onSelect}
            onEdit={onEdit}
            onAdvance={onAdvance}
            advancing={advancing}
          />
        ))}
        {isOver && (
          <div className="flex h-10 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300">
            <Plus className="h-3.5 w-3.5 text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  jobOrders: JobOrder[];
  stages: WorkflowStage[];
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  currencyLocale: string;
  onSelect: (jo: JobOrder) => void;
  onEdit: (jo: JobOrder) => void;
  onClaim: (jo: JobOrder) => void;
}

export function KanbanBoard({ jobOrders, stages, tenantSlug, tenantId, currencySymbol, currencyLocale, onSelect, onEdit, onClaim }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [optimisticOrders, setOptimisticOrders] = useState(jobOrders);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Require 8px of movement before drag starts — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    setOptimisticOrders(jobOrders);
  }, [jobOrders]);

  const activeStages = stages.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const completedStage = stages.find((s) => s.type === "completed");
  const cancelledStage = stages.find((s) => s.type === "cancelled");

  const allColumns = [
    ...activeStages,
    ...(completedStage ? [completedStage] : []),
    ...(cancelledStage ? [cancelledStage] : []),
  ];

  function getNextStage(currentSlug: string): WorkflowStage | null {
    const idx = activeStages.findIndex((s) => s.slug === currentSlug);
    if (idx === -1) return null;
    if (idx < activeStages.length - 1) return activeStages[idx + 1];
    return completedStage ?? null;
  }

  function handleAdvance(jo: JobOrder) {
    const next = getNextStage(jo.status);
    if (!next) return;
    if (next.type === "completed") { onClaim(jo); return; }
    doMove(jo, next);
  }

  function doMove(jo: JobOrder, targetStage: WorkflowStage) {
    const prevStatus = jo.status;
    setAdvancing(jo.id);
    setOptimisticOrders((prev) => prev.map((j) => j.id === jo.id ? { ...j, status: targetStage.slug } : j));
    updateJobOrderStatus(tenantSlug, tenantId, jo.id, targetStage.slug, targetStage.type)
      .then(() => { toast.success(`${jo.jobNo} → ${targetStage.name}`); queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] }); })
      .catch(() => {
        toast.error("Failed to update");
        setOptimisticOrders((prev) => prev.map((j) => j.id === jo.id ? { ...j, status: prevStatus } : j));
      })
      .finally(() => setAdvancing(null));
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragOver(event: { over: { id: string } | null }) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    setOverId(null);

    const { active, over } = event;
    if (!over) return;

    const jo = optimisticOrders.find((j) => j.id === active.id);
    const targetStage = allColumns.find((s) => s.slug === over.id);
    if (!jo || !targetStage || jo.status === targetStage.slug) return;

    if (targetStage.type === "completed") {
      onClaim(jo);
      return;
    }

    doMove(jo, targetStage);
  }

  const draggingOrder = draggingId ? optimisticOrders.find((j) => j.id === draggingId) ?? null : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver as never} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {allColumns.map((stage) => (
          <KanbanColumn
            key={stage.slug}
            stage={stage}
            cards={optimisticOrders.filter((j) => j.status === stage.slug)}
            stages={stages}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
            onSelect={onSelect}
            onEdit={onEdit}
            onAdvance={handleAdvance}
            advancing={advancing}
            isOver={overId === stage.slug}
          />
        ))}
      </div>

      <DragOverlay>
        {draggingOrder && (
          <KanbanCard
            jobOrder={draggingOrder}
            stages={stages}
            currencySymbol={currencySymbol}
            currencyLocale={currencyLocale}
            onSelect={() => {}}
            onEdit={() => {}}
            onAdvance={() => {}}
            advancing={null}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
