"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Shift</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select onValueChange={(v) => { if (v) setValue("employeeId", v as string); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee..." />
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
              <p className="text-sm text-destructive">{errors.employeeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Shift Label</Label>
            <Input placeholder="e.g. Morning Shift, Opening" {...register("title")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start *</Label>
              <Input type="datetime-local" {...register("startAt")} />
              {errors.startAt && (
                <p className="text-sm text-destructive">{errors.startAt.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>End *</Label>
              <Input type="datetime-local" {...register("endAt")} />
              {errors.endAt && (
                <p className="text-sm text-destructive">{errors.endAt.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." rows={2} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
