"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShiftSchema, type CreateShiftInput } from "../schema";
import { createShift } from "../actions";
import type { StaffEmployee } from "../types";

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
  tenantId: string;
  employees: StaffEmployee[];
  defaultStart?: string;
  defaultEnd?: string;
}

export function AddShiftDialog({
  open,
  onOpenChange,
  tenantSlug,
  tenantId,
  employees,
  defaultStart,
  defaultEnd,
}: AddShiftDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateShiftInput>({
    resolver: zodResolver(createShiftSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        startAt: defaultStart ?? "",
        endAt: defaultEnd ?? "",
        title: "",
        notes: "",
        employeeId: "",
      });
    }
  }, [open, defaultStart, defaultEnd, reset]);

  async function onSubmit(data: CreateShiftInput) {
    try {
      await createShift(tenantSlug, tenantId, data);
      toast.success("Shift added");
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add shift");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(680px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Staff / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">Add shift</DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon" className="mt-1 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Assignment">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/80">Employee *</Label>
                <Select value={watch("employeeId") ?? ""} onValueChange={(v) => { if (v) setValue("employeeId", v as string); }}>
                  <SelectTrigger>
                    {watch("employeeId") ? employees.find((e) => e.id === watch("employeeId"))?.name : <span className="text-muted-foreground">Select...</span>}
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                        {emp.position ? ` — ${emp.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeId && (
                  <p className="text-xs text-destructive">{errors.employeeId.message}</p>
                )}
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Schedule">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground/80">Shift Label</Label>
                  <Input placeholder="e.g. Morning Shift, Opening" {...register("title")} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">Start *</Label>
                    <Input type="datetime-local" {...register("startAt")} />
                    {errors.startAt && (
                      <p className="text-xs text-destructive">{errors.startAt.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-foreground/80">End *</Label>
                    <Input type="datetime-local" {...register("endAt")} />
                    {errors.endAt && (
                      <p className="text-xs text-destructive">{errors.endAt.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground/80">Notes</Label>
                  <Textarea placeholder="Optional notes..." rows={2} {...register("notes")} />
                </div>
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
