"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
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
import { STAGE_COLOR_MAP } from "../types";
import { saveWorkflowStages, deleteWorkflowStage } from "../actions";

const COLORS = Object.keys(STAGE_COLOR_MAP) as (keyof typeof STAGE_COLOR_MAP)[];

const COLOR_LABELS: Record<string, string> = {
  zinc: "Gray", blue: "Blue", orange: "Orange", violet: "Purple",
  emerald: "Green", red: "Red", amber: "Yellow", sky: "Sky",
};

type StageType = "active" | "completed" | "cancelled";

interface EditableStage {
  id?: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  type: StageType;
  isNew?: boolean;
}

interface WorkflowStageEditorProps {
  tenantSlug: string;
  tenantId: string;
  stages: WorkflowStage[];
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function WorkflowStageEditor({ tenantSlug, tenantId, stages }: WorkflowStageEditorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [local, setLocal] = useState<EditableStage[]>([]);

  // Split into steps (active), done (completed), cancelled
  const steps = local.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const doneStage = local.find((s) => s.type === "completed");
  const cancelStage = local.find((s) => s.type === "cancelled");

  function initLocal() {
    setLocal(stages.map((s) => ({ ...s, isNew: false })));
  }

  function handleOpenChange(o: boolean) {
    if (o) initLocal();
    setOpen(o);
  }

  function updateStep(idx: number, patch: Partial<EditableStage>) {
    setLocal((prev) => {
      const stepIds = steps.map((s) => s.id ?? s.slug);
      const globalIdx = prev.findIndex((s) => (s.id ?? s.slug) === stepIds[idx]);
      if (globalIdx === -1) return prev;
      return prev.map((s, i) => i === globalIdx ? { ...s, ...patch } : s);
    });
  }

  function updateSpecial(type: "completed" | "cancelled", patch: Partial<EditableStage>) {
    setLocal((prev) => prev.map((s) => s.type === type ? { ...s, ...patch } : s));
  }

  function addStep() {
    const maxOrder = Math.max(...local.map((s) => s.sortOrder), -1);
    setLocal((prev) => [
      ...prev,
      { name: "", slug: "", color: "zinc", sortOrder: maxOrder + 1, type: "active", isNew: true },
    ]);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= steps.length) return;
    setLocal((prev) => {
      const stepIds = steps.map((s) => s.id ?? s.slug);
      const idxA = prev.findIndex((s) => (s.id ?? s.slug) === stepIds[idx]);
      const idxB = prev.findIndex((s) => (s.id ?? s.slug) === stepIds[next]);
      if (idxA === -1 || idxB === -1) return prev;
      const arr = [...prev];
      const tmpOrder = arr[idxA].sortOrder;
      arr[idxA] = { ...arr[idxA], sortOrder: arr[idxB].sortOrder };
      arr[idxB] = { ...arr[idxB], sortOrder: tmpOrder };
      return arr;
    });
  }

  async function handleDeleteStep(stage: EditableStage) {
    if (!stage.id) {
      setLocal((prev) => prev.filter((s) => s !== stage));
      return;
    }
    setDeletingId(stage.id);
    try {
      await deleteWorkflowStage(tenantSlug, tenantId, stage.id);
      setLocal((prev) => prev.filter((s) => s.id !== stage.id));
      toast.success(`"${stage.name}" removed`);
      router.refresh();
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
        id?: string; name: string; slug: string; color: string;
        sortOrder: number; type: StageType;
      }> = [
        ...sorted.map((s, i) => ({
          id: s.isNew ? undefined : s.id,
          name: s.name.trim(),
          slug: s.id ? s.slug : (slugify(s.name.trim()) || `step-${i}`),
          color: s.color,
          sortOrder: i,
          type: "active" as StageType,
        })),
        ...(doneStage ? [{
          id: doneStage.isNew ? undefined : doneStage.id,
          name: doneStage.name.trim(),
          slug: doneStage.id ? doneStage.slug : (slugify(doneStage.name.trim()) || "completed"),
          color: doneStage.color,
          sortOrder: sorted.length,
          type: "completed" as StageType,
        }] : []),
        ...(cancelStage ? [{
          id: cancelStage.isNew ? undefined : cancelStage.id,
          name: cancelStage.name.trim(),
          slug: cancelStage.id ? cancelStage.slug : (slugify(cancelStage.name.trim()) || "cancelled"),
          color: cancelStage.color,
          sortOrder: sorted.length + 1,
          type: "cancelled" as StageType,
        }] : []),
      ];
      await saveWorkflowStages(tenantSlug, tenantId, toSave);
      toast.success("Workflow saved");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
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

            <div className="space-y-1.5">
              {steps.map((stage, idx) => (
                <div key={stage.id ?? `new-${idx}`} className="flex items-center gap-2">
                  {/* Move buttons */}
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      className="text-zinc-300 hover:text-zinc-500 disabled:opacity-20 leading-none"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === steps.length - 1}
                      className="text-zinc-300 hover:text-zinc-500 disabled:opacity-20 leading-none"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Name */}
                  <Input
                    value={stage.name}
                    onChange={(e) => updateStep(idx, { name: e.target.value })}
                    placeholder={`Step ${idx + 1} name`}
                    className={cn("h-8 text-sm flex-1", !stage.name.trim() && "border-amber-300 focus-visible:ring-amber-300")}
                  />

                  {/* Color */}
                  <div className="flex items-center gap-1 shrink-0">
                    {COLORS.filter((c) => c !== "red").map((color) => (
                      <button
                        key={color}
                        type="button"
                        title={COLOR_LABELS[color]}
                        onClick={() => updateStep(idx, { color })}
                        className={cn(
                          "h-4 w-4 rounded-full border-2 transition-all",
                          STAGE_COLOR_MAP[color].btn.split(" ")[0],
                          stage.color === color
                            ? "border-zinc-800 scale-125"
                            : "border-transparent opacity-50 hover:opacity-80"
                        )}
                      />
                    ))}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteStep(stage)}
                    disabled={deletingId === stage.id}
                    className="shrink-0 text-zinc-300 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={addStep}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add a step
              </button>
            </div>
          </div>

          {/* FLOW PREVIEW */}
          {steps.filter((s) => s.name.trim()).length > 0 && (
            <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">Preview</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {steps.filter((s) => s.name.trim()).map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      STAGE_COLOR_MAP[s.color]?.tab ?? "bg-zinc-100 text-zinc-700"
                    )}>
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
