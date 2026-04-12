"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployeeSchema, type CreateEmployeeInput } from "../schema";
import { createEmployee } from "../actions";

interface AddEmployeeDialogProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
}

export function AddEmployeeDialog({ tenantSlug, tenantId, currencySymbol }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema as any),
  });

  async function onSubmit(data: CreateEmployeeInput) {
    try {
      await createEmployee(tenantSlug, tenantId, data);
      toast.success("Employee added");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add employee");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" />
        New
      </DialogTrigger>
      <DialogContent className="max-w-lg border border-border/70 bg-popover/98 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label">HR</p>
          <DialogTitle>New</DialogTitle>
          <DialogDescription>Employee</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 rounded-[24px] border border-border/60 bg-background/62 p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input placeholder="Alex Morgan" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>No. <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="Auto-generated if blank" {...register("employeeNo")} />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="email" placeholder="juan@company.com" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="+31 6 12345678" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Position <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. Cashier, Manager" {...register("position")} />
            </div>
            <div className="space-y-2">
              <Label>Department <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. Operations" {...register("department")} />
            </div>
            <div className="space-y-2">
              <Label>Hire Date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="date" {...register("hireDate")} />
            </div>
            <div className="space-y-2">
              <Label>Salary ({currencySymbol}) <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="number" step="0.01" min={0} {...register("salary")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
