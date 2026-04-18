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
  showDuration: boolean;
  showAppointmentsAvailability: boolean;
  showJobOrdersAvailability: boolean;
}

export function ServiceDialog({
  tenantSlug,
  tenantId,
  service,
  open,
  onOpenChange,
  currencySymbol,
  showDuration,
  showAppointmentsAvailability,
  showJobOrdersAvailability,
}: ServiceDialogProps) {
  const router = useRouter();
  const isEditing = !!service;
  const usagePreview = [
    showAppointmentsAvailability && "Appointments",
    showJobOrdersAvailability && "Job Orders",
  ].filter(Boolean);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<ServiceInput>({
      resolver: zodResolver(serviceSchema as any),
      defaultValues: {
        name: service?.name ?? "",
        description: service?.description ?? "",
        duration: service?.duration ?? null,
        pricingType: service?.pricingType ?? "per_piece",
        price: Number(service?.price ?? 0),
        category: service?.category ?? "",
        isActive: service?.isActive ?? true,
        availableForAppointments: service?.availableForAppointments ?? showAppointmentsAvailability,
        availableForJobOrders: service?.availableForJobOrders ?? (!showAppointmentsAvailability || showJobOrdersAvailability),
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        name: service?.name ?? "",
        description: service?.description ?? "",
        duration: service?.duration ?? null,
        pricingType: service?.pricingType ?? "per_piece",
        price: Number(service?.price ?? 0),
        category: service?.category ?? "",
        isActive: service?.isActive ?? true,
        availableForAppointments: service?.availableForAppointments ?? showAppointmentsAvailability,
        availableForJobOrders: service?.availableForJobOrders ?? (!showAppointmentsAvailability || showJobOrdersAvailability),
      });
    }
  }, [open, reset, service, showAppointmentsAvailability, showJobOrdersAvailability]);

  async function onSubmit(data: ServiceInput) {
    const payload: ServiceInput = {
      ...data,
      duration: showDuration ? (data.duration ?? null) : (service?.duration ?? null),
    };

    try {
      if (isEditing) {
        await updateService(tenantSlug, tenantId, service.id, payload);
        toast.success("Service updated");
      } else {
        await createService(tenantSlug, tenantId, payload);
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
      <DialogContent className="max-w-lg border border-slate-200/80 bg-white p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)]">
        <DialogHeader>
          <p className="eyebrow-label text-primary">Service</p>
          <DialogTitle>{isEditing ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="e.g. Wash & Fold" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Optional notes for staff" {...register("description")} />
          </div>

          <div className={showDuration ? "grid grid-cols-3 gap-4" : "grid grid-cols-2 gap-4"}>
            {showDuration && (
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Optional"
                  {...register("duration")}
                />
                {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Pricing *</Label>
              <Controller
                control={control}
                name="pricingType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                    <SelectTrigger>
                      {field.value ? PRICING_TYPE_LABELS[field.value] : <span className="text-muted-foreground">Select...</span>}
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
              <Label>Rate ({currencySymbol})</Label>
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
            <Label>Category <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Dry Clean, Express" {...register("category")} />
          </div>

          {(showAppointmentsAvailability || showJobOrdersAvailability) && (
            <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Availability</p>
                <p className="text-xs text-muted-foreground">
                  Choose where this service can be used{usagePreview.length > 0 ? `: ${usagePreview.join(" and ")}` : "."}
                </p>
              </div>
              <div className="space-y-2">
                {showAppointmentsAvailability && (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
                    <div>
                      <Label className="cursor-pointer">Available for appointments</Label>
                      <p className="text-xs text-muted-foreground">Shows in scheduling and staff assignment flows.</p>
                    </div>
                    <Controller
                      control={control}
                      name="availableForAppointments"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                )}
                {showJobOrdersAvailability && (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
                    <div>
                      <Label className="cursor-pointer">Available for job orders</Label>
                      <p className="text-xs text-muted-foreground">Shows in job orders and POS service selection.</p>
                    </div>
                    <Controller
                      control={control}
                      name="availableForJobOrders"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-2.5">
            <Label className="cursor-pointer">Active</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <DialogFooter className="border-t border-slate-200/80 pt-4">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
