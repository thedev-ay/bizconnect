"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serviceSchema, type ServiceInput } from "../schema";
import { createService, updateService } from "../actions";
import { PRICING_TYPE_LABELS, type Service } from "../types";

interface ServiceDialogProps {
  tenantSlug: string;
  tenantId: string;
  service?: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencySymbol: string;
}

export function ServiceDialog({
  tenantSlug,
  tenantId,
  service,
  open,
  onOpenChange,
  currencySymbol,
}: ServiceDialogProps) {
  const router = useRouter();
  const isEditing = !!service;

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<ServiceInput>({
      resolver: zodResolver(serviceSchema),
      defaultValues: {
        name: service?.name ?? "",
        description: service?.description ?? "",
        pricingType: service?.pricingType ?? "per_piece",
        price: Number(service?.price ?? 0),
        category: service?.category ?? "",
        isActive: service?.isActive ?? true,
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        name: service?.name ?? "",
        description: service?.description ?? "",
        pricingType: service?.pricingType ?? "per_piece",
        price: Number(service?.price ?? 0),
        category: service?.category ?? "",
        isActive: service?.isActive ?? true,
      });
    }
  }, [open]);

  async function onSubmit(data: ServiceInput) {
    try {
      if (isEditing) {
        await updateService(tenantSlug, tenantId, service.id, data);
        toast.success("Service updated");
      } else {
        await createService(tenantSlug, tenantId, data);
        toast.success("Service created");
      }
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save service");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input placeholder="e.g. Wash & Fold" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Optional notes for staff" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pricing Type *</Label>
              <Controller
                control={control}
                name="pricingType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRICING_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Price ({currencySymbol}) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register("price")}
              />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category <span className="text-zinc-400 font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Dry Clean, Express" {...register("category")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
            <Label className="cursor-pointer">Active</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
