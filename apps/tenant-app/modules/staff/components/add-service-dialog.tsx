"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInputField } from "@/components/ui/currency-input-field";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(680px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Services / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">Add service</DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon" className="mt-1 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Identity">
            <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/80">Service Name *</Label>
              <Input placeholder="e.g. Haircut, Facial, Massage" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground/80">Description</Label>
              <Textarea rows={3} placeholder="Optional description" {...register("description")} />
            </div>
            </div>
            </DialogFormSection>
            <DialogFormSection num="02" title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/80">Duration (minutes) *</Label>
                <Input type="number" min={1} {...register("duration")} />
                {errors.duration && <p className="text-xs text-destructive">{errors.duration.message}</p>}
              </div>
              <CurrencyInputField currencySymbol={currencySymbol} label="Price *" error={errors.price?.message} {...register("price")} />
            </div>
            </DialogFormSection>
          </div>
          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Service"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
