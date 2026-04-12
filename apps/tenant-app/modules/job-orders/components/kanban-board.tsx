"use client";

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { createPortal, flushSync } from "react-dom";
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
  normal: { dot: "bg-teal-500",  badge: "", label: "" },
  high:   { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "High" },
  urgent: { dot: "bg-red-500 animate-pulse", badge: "bg-red-100 text-red-700 border border-red-300", label: "Urgent" },
};

interface KanbanCardProps {
  jobOrder: JobOrder;
  stages: WorkflowStage[];
  onSelect: (jo: JobOrder) => void;
  onEdit: (jo: JobOrder) => void;
  onAdvance: (jo: JobOrder) => void;
  advancing: string | null;
  overlay?: boolean;
}

function KanbanCard({ jobOrder: jo, stages, onSelect, onEdit, onAdvance, advancing, overlay }: KanbanCardProps) {
  const stage = stages.find((s) => s.slug === jo.status);
  const isTerminal = stage?.type === "completed" || stage?.type === "cancelled";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: jo.id,
    disabled: isTerminal || overlay,
  });

  const isOverdue = jo.dueDate && new Date(jo.dueDate) < new Date();
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
        className="h-24 rounded-[26px] border-2 border-dashed border-border/70 bg-muted/30"
      />
    );
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : { transform: CSS.Transform.toString(transform) }}
      className={cn(
        "flex select-none flex-col gap-2.5 rounded-[24px] border bg-white/96 p-3.5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)] ring-1 ring-white/65",
        overlay
          ? "rotate-1 cursor-grabbing shadow-xl"
          : isTerminal
          ? "cursor-pointer transition-shadow hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.28)]"
          : "cursor-grab transition-all active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.28)]",
        jo.priority === "urgent" ? "border-red-200" : "border-teal-100/90"
      )}
      {...(!overlay && !isTerminal ? { ...attributes, ...listeners } : {})}
      onClick={(e) => {
        if (!overlay) { e.stopPropagation(); onSelect(jo); }
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">{jo.jobNo}</span>
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
              className="rounded-full p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground/70"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Customer */}
      <div>
        <p className="text-sm font-bold leading-tight text-foreground">{jo.customerName}</p>
        {jo.contactNo && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            {jo.contactNo}
          </div>
        )}
      </div>

      {/* Services */}
      {jo.items.length > 0 && (
        <div className="space-y-0.5 rounded-2xl bg-muted/24 px-2.5 py-2">
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
      )}

      {/* Assigned staff */}
      <div className="flex items-center justify-between gap-2">
        {jo.assignedStaff.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {jo.assignedStaff.slice(0, 2).map((s) => (
            <span key={s.employeeId} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
              {s.name.split(" ")[0]}
            </span>
          ))}
          {jo.assignedStaff.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{jo.assignedStaff.length - 2}</span>
          )}
        </div>
        ) : <span />}
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between gap-2 border-t border-border/50 pt-2">
        <div>
          {jo.dueDate && (
            <p className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-muted-foreground")}>
              Due {format(new Date(jo.dueDate), "MMM d")}
              {isOverdue && " · overdue"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{format(new Date(jo.createdAt), "MMM d, h:mm a")}</p>
        </div>
      </div>

      {/* Advance button — hidden during drag overlay */}
      {!overlay && nextStage && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onAdvance(jo); }}
          disabled={advancing === jo.id}
          className={cn(
            "flex w-full items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
            jo.priority === "urgent"
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : isReadyForCompletion
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
          )}
        >
          {advancing === jo.id ? "Updating..." : nextStage.name}
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
  onSelect: (jo: JobOrder) => void;
  onEdit: (jo: JobOrder) => void;
  onAdvance: (jo: JobOrder) => void;
  advancing: string | null;
  isOver: boolean;
}

function KanbanColumn({ stage, cards, stages, onSelect, onEdit, onAdvance, advancing, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.slug });

  const laneTheme = stage.type === "completed"
    ? {
        header: "bg-emerald-600 text-white border-emerald-700",
        body: isOver ? "bg-background border-emerald-300" : "bg-background border-border/70",
        badge: "bg-white/18 text-white",
      }
    : stage.type === "cancelled"
    ? {
        header: "bg-red-600 text-white border-red-700",
        body: isOver ? "bg-background border-red-300" : "bg-background border-border/70",
        badge: "bg-white/18 text-white",
      }
    : {
        header: "bg-teal-600 text-white border-teal-700",
        body: isOver ? "bg-background border-teal-300" : "bg-background border-border/70",
        badge: "bg-white/18 text-white",
      };

  return (
    <div className="flex flex-col min-w-0 flex-1 min-w-[220px]">
      <div className={cn(
        "flex items-center justify-between rounded-t-[24px] border border-b-0 px-3 py-3",
        laneTheme.header
      )}>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">{stage.name}</p>
        </div>
        <span className={cn("ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums", laneTheme.badge)}>
          {cards.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[120px] flex-1 space-y-2 rounded-b-[24px] border border-t-0 p-2.5 transition-colors",
          laneTheme.body
        )}
      >
        {cards.length === 0 && !isOver && (
          <div className="flex h-20 items-center justify-center">
            <p className="flex items-center gap-1 text-xs text-muted-foreground/50">
              <Clock className="h-3.5 w-3.5" />
              No orders
            </p>
          </div>
        )}
        {cards.map((jo) => (
          <KanbanCard
            key={jo.id}
            jobOrder={jo}
            stages={stages}
            onSelect={onSelect}
            onEdit={onEdit}
            onAdvance={onAdvance}
            advancing={advancing}
          />
        ))}
        {isOver && (
          <div className="flex h-10 items-center justify-center rounded-2xl border-2 border-dashed border-primary/30">
            <Plus className="h-3.5 w-3.5 text-primary/60" />
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
  onSelect: (jo: JobOrder) => void;
  onEdit: (jo: JobOrder) => void;
  onClaim: (jo: JobOrder) => void;
}

export function KanbanBoard({ jobOrders, stages, tenantSlug, tenantId, onSelect, onEdit, onClaim }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [optimisticOrders, setOptimisticOrders] = useState(jobOrders);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragOverlayStyle, setDragOverlayStyle] = useState<CSSProperties | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [pendingStatuses, setPendingStatuses] = useState<Record<string, string>>({});

  // Require 8px of movement before drag starts — prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    setOptimisticOrders(
      jobOrders.map((jobOrder) =>
        pendingStatuses[jobOrder.id]
          ? { ...jobOrder, status: pendingStatuses[jobOrder.id] }
          : jobOrder
      )
    );
  }, [jobOrders, pendingStatuses]);

  useEffect(() => {
    setPendingStatuses((current) => {
      const next = { ...current };
      let changed = false;

      for (const jobOrder of jobOrders) {
        const pendingStatus = current[jobOrder.id];
        if (pendingStatus && jobOrder.status === pendingStatus) {
          delete next[jobOrder.id];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [jobOrders]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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
    flushSync(() => {
      setAdvancing(jo.id);
      setPendingStatuses((prev) => ({ ...prev, [jo.id]: targetStage.slug }));
      setOptimisticOrders((prev) => prev.map((j) => j.id === jo.id ? { ...j, status: targetStage.slug } : j));
    });

    updateJobOrderStatus(tenantSlug, tenantId, jo.id, targetStage.slug, targetStage.type)
      .then(() => { toast.success(`${jo.jobNo} → ${targetStage.name}`); queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] }); })
      .catch(() => {
        toast.error("Failed to update");
        setPendingStatuses((prev) => {
          const next = { ...prev };
          delete next[jo.id];
          return next;
        });
        setOptimisticOrders((prev) => prev.map((j) => j.id === jo.id ? { ...j, status: prevStatus } : j));
      })
      .finally(() => setAdvancing(null));
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
    const initialRect = event.active.rect.current.initial;

    setDragOverlayStyle(
      initialRect
        ? {
            width: initialRect.width,
            height: initialRect.height,
          }
        : undefined
    );
  }

  function handleDragOver(event: { over: { id: string } | null }) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      setDraggingId(null);
      setOverId(null);
      setDragOverlayStyle(undefined);
      return;
    }

    const jo = optimisticOrders.find((j) => j.id === active.id);
    const targetStage = allColumns.find((s) => s.slug === over.id);
    if (!jo || !targetStage || jo.status === targetStage.slug) {
      setDraggingId(null);
      setOverId(null);
      setDragOverlayStyle(undefined);
      return;
    }

    if (targetStage.type === "completed") {
      onClaim(jo);
      setDraggingId(null);
      setOverId(null);
      setDragOverlayStyle(undefined);
      return;
    }

    doMove(jo, targetStage);
    setDraggingId(null);
    setOverId(null);
    setDragOverlayStyle(undefined);
  }

  function handleDragCancel() {
    setDraggingId(null);
    setOverId(null);
    setDragOverlayStyle(undefined);
  }

  const draggingOrder = draggingId ? optimisticOrders.find((j) => j.id === draggingId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver as never}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2">
        {allColumns.map((stage) => (
          <KanbanColumn
            key={stage.slug}
            stage={stage}
            cards={optimisticOrders.filter((j) => j.status === stage.slug)}
            stages={stages}
            onSelect={onSelect}
            onEdit={onEdit}
            onAdvance={handleAdvance}
            advancing={advancing}
            isOver={overId === stage.slug}
          />
        ))}
      </div>

      {isMounted
        ? createPortal(
            <DragOverlay adjustScale={false} dropAnimation={null}>
              {/*
                Disabling drop animation avoids a brief flash where the source
                card becomes visible again before the optimistic lane update paints.
              */}
              {draggingOrder && (
                <div style={dragOverlayStyle}>
                  <KanbanCard
                    jobOrder={draggingOrder}
                    stages={stages}
                    onSelect={() => {}}
                    onEdit={() => {}}
                    onAdvance={() => {}}
                    advancing={null}
                    overlay
                  />
                </div>
              )}
            </DragOverlay>,
            document.body
          )
        : null}
    </DndContext>
  );
}
