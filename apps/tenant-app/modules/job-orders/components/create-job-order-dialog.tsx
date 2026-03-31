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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createJobOrderSchema, type CreateJobOrderInput } from "../schema";
import { createJobOrder } from "../actions";

interface CreateJobOrderDialogProps {
  tenantSlug: string;
  tenantId: string;
}

export function CreateJobOrderDialog({ tenantSlug, tenantId }: CreateJobOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateJobOrderInput>({
    resolver: zodResolver(createJobOrderSchema as any),
    defaultValues: { priority: "normal" },
  });

  async function onSubmit(data: CreateJobOrderInput) {
    try {
      await createJobOrder(tenantSlug, tenantId, data);
      toast.success("Job order created");
      setOpen(false);
      reset();
      setPriority("normal");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create job order");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Job Order
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Job Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register("customerName")} />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the job or service to be done..."
                rows={3}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => {
                  const val = v as "low" | "normal" | "high" | "urgent";
                  setPriority(val);
                  setValue("priority", val);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Assigned To</Label>
              <Input placeholder="Staff name" {...register("assignedTo")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
