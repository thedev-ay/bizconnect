"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createServiceSchema, type CreateServiceInput } from "../schema";
import { createService } from "../actions";

interface AddServiceDialogProps {
  tenantSlug: string;
  tenantId: string;
}

export function AddServiceDialog({ tenantSlug, tenantId }: AddServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema as any),
    defaultValues: { duration: 60, price: 0 },
  });

  async function onSubmit(data: CreateServiceInput) {
    try {
      await createService(tenantSlug, tenantId, data);
      toast.success("Service added");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add service");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add Service
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Service Name *</Label>
            <Input placeholder="e.g. Haircut, Facial, Massage" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Optional description..." {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes) *</Label>
              <Input type="number" min={5} step={5} {...register("duration")} />
              {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Price (₱) *</Label>
              <Input type="number" step="0.01" min={0} {...register("price")} />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
