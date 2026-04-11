"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, Plus, Trash2, GripVertical, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkflowStage } from "../types";
import { saveWorkflowStages, deleteWorkflowStage } from "../actions";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type StageType = "active" | "completed" | "cancelled";

interface EditableStage {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  type: StageType;
  isNew?: boolean;
}

interface WorkflowStageEditorProps {
  tenantSlug: string;
  tenantId: string;
  stages: WorkflowStage[];
  stageCounts: Record<string, number>;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function SortableStepRow({
  stage,
  onUpdate,
  onDelete,
  deleting,
}: {
  stage: EditableStage;
  onUpdate: (patch: Partial<EditableStage>) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={stage.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Step name"
        className={cn("h-8 text-sm flex-1", !stage.name.trim() && "border-amber-300 focus-visible:ring-amber-300")}
      />


      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 text-zinc-300 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function WorkflowStageEditor({ tenantSlug, tenantId, stages, stageCounts }: WorkflowStageEditorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EditableStage | null>(null);
  const [local, setLocal] = useState<EditableStage[]>([]);

  // Split into steps (active), done (completed), cancelled
  const steps = local.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const doneStage = local.find((s) => s.type === "completed");
  const cancelStage = local.find((s) => s.type === "cancelled");

  function initLocal() {
    if (stages.length > 0) {
      setLocal(stages.map((s) => ({ ...s, isNew: false })));
    } else {
      // Start with empty active steps + the required completed and cancelled terminals
      setLocal([
        { id: crypto.randomUUID(), name: "Claimed", slug: "claimed", sortOrder: 0, type: "completed", isNew: true },
        { id: crypto.randomUUID(), name: "Cancelled", slug: "cancelled", sortOrder: 1, type: "cancelled", isNew: true },
      ]);
    }
  }

  function handleOpenChange(o: boolean) {
    if (o) initLocal();
    setOpen(o);
  }

  function updateStep(stageId: string, patch: Partial<EditableStage>) {
    setLocal((prev) =>
      prev.map((step) => {
        if (step.id !== stageId) return step;

        return {
          ...step,
          ...patch,
          slug: patch?.name
            ? slugify(patch.name)
            : step.slug,
        };
      })
    );
  }

  function updateSpecial(type: "completed" | "cancelled", patch: Partial<EditableStage>) {
    setLocal((prev) => prev.map((s) => s.type === type ? { ...s, ...patch } : s));
  }

  function addStep() {
    const maxOrder = Math.max(...local.map((s) => s.sortOrder), -1);
    setLocal((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", slug: "", sortOrder: maxOrder + 1, type: "active", isNew: true },
    ]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocal((prev) => {
      const activeSteps = prev.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
      const oldIdx = activeSteps.findIndex((s) => s.id === active.id);
      const newIdx = activeSteps.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(activeSteps, oldIdx, newIdx).map((s, i) => ({ ...s, sortOrder: i }));
      const nonActive = prev.filter((s) => s.type !== "active");
      return [...reordered, ...nonActive];
    });
  }

  async function handleDeleteStep(stage: EditableStage) {
    if (!stage.id || stage.isNew) {
      setLocal((prev) => prev.filter((s) => s !== stage));
      return;
    }
    const count = stageCounts[stage.slug] ?? 0;
    if (count > 0) {
      setPendingDelete(stage);
      return;
    }
    await doDeleteStep(stage);
  }

  async function doDeleteStep(stage: EditableStage) {
    if (!stage.id) return;
    setDeletingId(stage.id);
    setPendingDelete(null);
    try {
      await deleteWorkflowStage(tenantSlug, tenantId, stage.id);
      setLocal((prev) => prev.filter((s) => s.id !== stage.id));
      toast.success(`"${stage.name}" removed`);
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const emptyNames = local.some((s) => !s.name.trim());
  const hasErrors = steps.length < 1 || emptyNames || !doneStage;

  async function handleSave() {
    if (hasErrors) return;
    setSaving(true);
    try {
      // Recalculate sortOrders: active steps first (sorted), then completed, then cancelled
      const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
      const toSave: Array<{
        id: string; name: string; slug: string;
        sortOrder: number; type: StageType;
      }> = [
        ...sorted.map((s, i) => ({
          id: s.id,
          name: s.name.trim(),
          slug: s.isNew ? (slugify(s.name.trim()) || `step-${i}`) : s.slug,
          sortOrder: i,
          type: "active" as StageType,
        })),
        ...(doneStage ? [{
          id: doneStage.id,
          name: doneStage.name.trim() || "Completed",
          slug: doneStage.isNew ? (slugify(doneStage.name.trim()) || "completed") : doneStage.slug,
          sortOrder: sorted.length,
          type: "completed" as StageType,
        }] : []),
        ...(cancelStage ? [{
          id: cancelStage.id,
          name: cancelStage.name.trim() || "Cancelled",
          slug: cancelStage.isNew ? (slugify(cancelStage.name.trim()) || "cancelled") : cancelStage.slug,
          sortOrder: sorted.length + 1,
          type: "cancelled" as StageType,
        }] : []),
      ];
      // Silently deduplicate new stage slugs against existing ones
      const usedSlugs = new Set(toSave.filter((s) => s.id).map((s) => s.slug));
      for (const stage of toSave) {
        if (stage.id) continue;
        let slug = stage.slug;
        let n = 2;
        while (usedSlugs.has(slug)) slug = `${stage.slug}-${n++}`;
        stage.slug = slug;
        usedSlugs.add(slug);
      }

      await saveWorkflowStages(tenantSlug, tenantId, toSave);
      toast.success("Workflow saved");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] }); // re-sync editor with actual DB state
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Settings className="h-3.5 w-3.5" />
        Workflow
      </DialogTrigger>

      <DialogContent className="min-w-4xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>Job Order Workflow</DialogTitle>
          <p className="text-xs text-zinc-400">
            Set up the steps your orders go through, from drop-off to pickup.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">

          {/* STEPS */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Steps</p>
            <p className="text-xs text-zinc-400">The stages an order passes through before it's ready.</p>

            {steps.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                <p className="text-sm font-medium text-zinc-500">No steps yet</p>
                <p className="mt-1 text-xs text-zinc-400">Add at least one step to define your workflow.</p>
              </div>
            )}

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {steps.map((stage) => (
                    <SortableStepRow
                      key={stage.id}
                      stage={stage}
                      onUpdate={(patch) => updateStep(stage.id, patch)}
                      onDelete={() => handleDeleteStep(stage)}
                      deleting={deletingId === stage.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={addStep}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add a step
            </button>
          </div>

          {/* FLOW PREVIEW */}
          {steps.filter((s) => s.name.trim()).length > 0 && (
            <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">Preview</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {steps.filter((s) => s.name.trim()).map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                      {s.name}
                    </span>
                    <ArrowRight className="h-3 w-3 text-zinc-300" />
                  </span>
                ))}
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {doneStage?.name || "Completed"}
                </span>
              </div>
            </div>
          )}

          {/* DONE STAGE */}
          <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Completed stage</p>
                <p className="text-[10px] text-emerald-600">When an order reaches this stage, payment is collected and the order is closed.</p>
              </div>
            </div>
            {doneStage && (
              <Input
                value={doneStage.name}
                onChange={(e) => updateSpecial("completed", { name: e.target.value })}
                placeholder="e.g. Claimed, Picked Up, Done"
                className="h-8 text-sm bg-white"
              />
            )}
          </div>

          {/* CANCEL STAGE */}
          {cancelStage && (
            <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-800">Cancelled stage</p>
                  <p className="text-[10px] text-red-500">Used when an order is abandoned or refused.</p>
                </div>
              </div>
              <Input
                value={cancelStage.name}
                onChange={(e) => updateSpecial("cancelled", { name: e.target.value })}
                placeholder="e.g. Cancelled, Rejected"
                className="h-8 text-sm bg-white"
              />
            </div>
          )}
        </div>

        {emptyNames && (
          <p className="text-xs font-medium text-amber-600 pt-2">Give every step a name before saving.</p>
        )}
        {!emptyNames && steps.length < 1 && (
          <p className="text-xs font-medium text-amber-600 pt-2">Add at least one step.</p>
        )}

        {pendingDelete && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2 mt-2">
            <p className="text-xs font-semibold text-red-800">
              Remove "{pendingDelete.name}"?
            </p>
            <p className="text-xs text-red-700">
              There {stageCounts[pendingDelete.slug] === 1 ? "is" : "are"} <strong>{stageCounts[pendingDelete.slug]}</strong> job order{stageCounts[pendingDelete.slug] === 1 ? "" : "s"} currently in this stage. They will remain but won't appear on the board. Orders with no matching stage are automatically removed after 1 week — to restore them, re-add a step with the same name.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPendingDelete(null)}>Keep it</Button>
              <Button size="sm" variant="destructive" onClick={() => doDeleteStep(pendingDelete)} disabled={!!deletingId}>
                {deletingId ? "Removing..." : "Remove anyway"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || hasErrors}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
