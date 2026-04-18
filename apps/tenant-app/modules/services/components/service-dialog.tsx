"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { CurrencyInputField } from "@/components/ui/currency-input-field";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(680px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">
                Services / {isEditing ? "Edit" : "New"}
              </p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {isEditing ? "Edit service" : "Add service"}
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Identity">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Name</Label>
                  <Input placeholder="e.g. Wash & Fold" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Description</Label>
                  <Textarea
                    rows={2}
                    placeholder="Optional notes for staff"
                    {...register("description")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Category <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="e.g. Dry Clean, Express" {...register("category")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Pricing">
              <div className={showDuration ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
                {showDuration && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">Duration (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Optional"
                      {...register("duration")}
                    />
                    {errors.duration && (
                      <p className="text-xs text-destructive">{errors.duration.message}</p>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Pricing *</Label>
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
                <CurrencyInputField
                  currencySymbol={currencySymbol}
                  label="Rate"
                  placeholder="0.00"
                  error={errors.price?.message}
                  {...register("price")}
                />
              </div>
            </DialogFormSection>

            <DialogFormSection num="03" title="Availability">
              <div className="space-y-3">
                {(showAppointmentsAvailability || showJobOrdersAvailability) && (
                  <div className="space-y-2 rounded-[22px] border border-border/60 bg-muted/30 p-3">
                    {showAppointmentsAvailability && (
                      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/90 px-3 py-2.5">
                        <div>
                          <Label className="cursor-pointer text-sm text-foreground">
                            Available for appointments
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Shows in scheduling and staff assignment flows.
                          </p>
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
                      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/90 px-3 py-2.5">
                        <div>
                          <Label className="cursor-pointer text-sm text-foreground">
                            Available for job orders
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Shows in job orders and POS service selection.
                          </p>
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
                )}
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <div>
                  <Label className="cursor-pointer text-sm text-foreground">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive services stay in records but are hidden from new selections.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
