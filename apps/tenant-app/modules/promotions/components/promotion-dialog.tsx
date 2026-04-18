"use client";

import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { promotionSchema, type PromotionInput } from "../schema";
import { createPromotion, updatePromotion } from "../actions";
import { PROMO_TYPE_LABELS, DAY_LABELS, type Promotion } from "../types";

interface ProductOption {
  id: string;
  name: string;
  category: string | null;
}

interface PromotionDialogProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  products: ProductOption[];
  promotion?: Promotion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromotionDialog({
  tenantSlug,
  tenantId,
  currencySymbol,
  products,
  promotion,
  open,
  onOpenChange,
}: PromotionDialogProps) {
  const router = useRouter();
  const isEditing = !!promotion;

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    promotion?.items.map((i) => i.itemId) ?? []
  );
  const [productSearch, setProductSearch] = useState("");

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } =
    useForm<PromotionInput>({
      resolver: zodResolver(promotionSchema as any),
      defaultValues: {
        name: promotion?.name ?? "",
        description: promotion?.description ?? "",
        type: promotion?.type ?? "percent_off",
        value: Number(promotion?.value ?? 0),
        buyQty: promotion?.buyQty ?? 1,
        getQty: promotion?.getQty ?? 1,
        daysOfWeek: (promotion?.daysOfWeek as number[]) ?? [],
        startTime: promotion?.startTime ?? "",
        endTime: promotion?.endTime ?? "",
        startsAt: promotion?.startsAt ? new Date(promotion.startsAt).toISOString().slice(0, 10) : "",
        endsAt: promotion?.endsAt ? new Date(promotion.endsAt).toISOString().slice(0, 10) : "",
        isActive: promotion?.isActive ?? true,
        itemIds: [],
      },
    });

  const promoType = watch("type");
  const daysOfWeek = watch("daysOfWeek") ?? [];

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedItemIds(promotion?.items.map((i) => i.itemId) ?? []);
      setProductSearch("");
    }
  }, [open, promotion]);

  function toggleDay(day: number) {
    const current = (watch("daysOfWeek") ?? []) as number[];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    setValue("daysOfWeek", next);
  }

  function toggleItem(id: string) {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function onSubmit(data: PromotionInput) {
    const payload = { ...data, itemIds: selectedItemIds };
    try {
      if (isEditing) {
        await updatePromotion(tenantSlug, tenantId, promotion.id, payload);
        toast.success("Promotion updated");
      } else {
        await createPromotion(tenantSlug, tenantId, payload);
        toast.success("Promotion created");
      }
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save promotion");
    }
  }

  const valueLabel =
    promoType === "percent_off" || promoType === "day_time" ? "%" :
    promoType === "fixed_price" ? "Fixed price" : "Amount off";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(920px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">
                Promotions / {isEditing ? "Edit" : "New"}
              </p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {isEditing ? "Edit promotion" : "Add promotion"}
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Identity">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name *</Label>
                  <Input placeholder="e.g. Summer Sale" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea rows={2} placeholder="Notes" {...register("description")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Offer">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                        <SelectTrigger>
                          {field.value ? PROMO_TYPE_LABELS[field.value] : <span className="text-muted-foreground">Select...</span>}
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROMO_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {promoType !== "buy_x_get_y" && (
                  promoType === "percent_off" || promoType === "day_time" ? (
                    <div className="space-y-2">
                      <Label>{valueLabel} *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={100}
                        {...register("value")}
                      />
                    </div>
                  ) : (
                    <CurrencyInputField
                      currencySymbol={currencySymbol}
                      label={`${valueLabel} *`}
                      type="number"
                      step="0.01"
                      min={0}
                      error={errors.value?.message}
                      {...register("value")}
                    />
                  )
                )}

                {promoType === "buy_x_get_y" && (
                  <>
                    <div className="space-y-2">
                      <Label>Buy Qty *</Label>
                      <Input type="number" min={1} {...register("buyQty")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Get Free Qty *</Label>
                      <Input type="number" min={1} {...register("getQty")} />
                    </div>
                  </>
                )}
              </div>
            </DialogFormSection>

            <DialogFormSection num="03" title="Schedule">
              <div className="space-y-4">
                {promoType === "day_time" && (
                  <div className="space-y-3 rounded-[22px] border border-border/60 bg-muted/30 p-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Days</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleDay(i)}
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                              (daysOfWeek as number[]).includes(i)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <Input type="time" {...register("startTime")} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <Input type="time" {...register("endTime")} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Starts <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input type="date" {...register("startsAt")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ends <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input type="date" {...register("endsAt")} />
                  </div>
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="04" title="Scope">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Products <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-10 text-sm"
                  />
                  <div className="max-h-48 overflow-y-auto rounded-[20px] border border-border/70 divide-y divide-border/60">
                    {(() => {
                      const filtered = products.filter((p) => {
                        const q = productSearch.toLowerCase();
                        return !q || p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
                      });
                      if (filtered.length === 0) {
                        return <p className="px-3 py-3 text-sm text-muted-foreground">No products found</p>;
                      }
                      return filtered.map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/30"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(p.id)}
                            onChange={() => toggleItem(p.id)}
                            className="h-4 w-4 rounded border-border/70"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                            {p.category && (
                              <p className="text-xs text-muted-foreground">{p.category}</p>
                            )}
                          </div>
                        </label>
                      ));
                    })()}
                  </div>
                  {selectedItemIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedItemIds.length} product{selectedItemIds.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5">
                  <div>
                    <Label className="cursor-pointer text-sm text-foreground">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Inactive promotions stay saved but do not apply at checkout.
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
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Promotion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
