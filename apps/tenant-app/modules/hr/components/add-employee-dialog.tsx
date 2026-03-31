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
}

export function AddEmployeeDialog({ tenantSlug, tenantId }: AddEmployeeDialogProps) {
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
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Employee
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Full Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Employee No.</Label>
              <Input placeholder="Auto-generated if blank" {...register("employeeNo")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="juan@company.com" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+63 9XX XXX XXXX" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input placeholder="e.g. Cashier, Manager" {...register("position")} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input placeholder="e.g. Operations" {...register("department")} />
            </div>
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Input type="date" {...register("hireDate")} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Salary (₱)</Label>
              <Input type="number" step="0.01" min={0} {...register("salary")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
