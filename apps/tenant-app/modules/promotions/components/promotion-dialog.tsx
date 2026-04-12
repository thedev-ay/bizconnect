"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  products: ProductOption[];
  promotion?: Promotion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromotionDialog({
  tenantSlug,
  tenantId,
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

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors, isSubmitting } } =
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
  }, [open]);

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
      <DialogContent className="flex max-h-[90vh] min-w-[min(92vw,64rem)] w-[min(96vw,72rem)] max-w-none flex-col overflow-hidden border border-border/70 bg-popover/98 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label">Promotions</p>
          <DialogTitle>{isEditing ? "Edit" : "New"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">

          <div className="grid gap-4 rounded-[24px] border border-border/60 bg-background/62 p-4 sm:grid-cols-2">
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

          <div className="grid gap-4 rounded-[24px] border border-border/60 bg-background/62 p-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label>{valueLabel} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={promoType === "percent_off" || promoType === "day_time" ? 100 : undefined}
                  {...register("value")}
                />
              </div>
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

          {/* Day/time restrictions */}
          {promoType === "day_time" && (
            <div className="space-y-3 rounded-[24px] border border-border/60 bg-background/62 p-4">
              <p className="eyebrow-label">Schedule</p>
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
              <div className="grid grid-cols-2 gap-4">
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

          <div className="grid gap-4 rounded-[24px] border border-border/60 bg-background/62 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Starts <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="date" {...register("startsAt")} />
            </div>
            <div className="space-y-2">
              <Label>Ends <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="date" {...register("endsAt")} />
            </div>
          </div>

          <div className="space-y-2 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <Label>
              Products <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="max-h-48 overflow-y-auto rounded-[20px] border border-border/70 divide-y divide-border/60">
              {(() => {
                const filtered = products.filter((p) => {
                  const q = productSearch.toLowerCase();
                  return !q || p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
                });
                if (filtered.length === 0) {
                  return <p className="px-3 py-3 text-sm text-zinc-400">No products found</p>;
                }
                return filtered.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(p.id)}
                      onChange={() => toggleItem(p.id)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 truncate">{p.name}</p>
                      {p.category && (
                        <p className="text-xs text-zinc-400">{p.category}</p>
                      )}
                    </div>
                  </label>
                ));
              })()}
            </div>
            {selectedItemIds.length > 0 && (
              <p className="text-xs text-zinc-500">{selectedItemIds.length} product{selectedItemIds.length !== 1 ? "s" : ""} selected</p>
            )}
          </div>

          {/* Active toggle */}
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
          </div>

          <DialogFooter className="-mx-5 -mb-5 mt-4 shrink-0 border-t border-border/60 px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Promotion"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
