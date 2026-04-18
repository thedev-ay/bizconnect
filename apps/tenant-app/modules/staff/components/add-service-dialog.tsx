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
  currencySymbol: string;
}

export function AddServiceDialog({ tenantSlug, tenantId, currencySymbol }: AddServiceDialogProps) {
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
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" /> New Service
      </DialogTrigger>
      <DialogContent className="max-w-xl border border-slate-200/80 bg-white p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label text-primary">Services</p>
          <DialogTitle>New Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input placeholder="e.g. Haircut, Facial, Massage" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Optional description" {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes) *</Label>
                <Input type="number" min={1} {...register("duration")} />
                {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Price ({currencySymbol}) *</Label>
                <Input type="number" step="0.01" min={0} {...register("price")} />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200/80 pt-4">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
