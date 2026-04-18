"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, WifiOff, X } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
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
import { createItemSchema, type CreateItemInput } from "../schema";
import { createItem } from "../actions";

interface AddItemDialogProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
}

function MarginChip({ cost, price }: { cost: number; price: number }) {
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
  const profit = price - cost;
  const pct = Math.min(100, Math.max(0, margin));

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
          Margin
        </p>
        <p className="mt-0.5 text-sm font-semibold text-foreground">
          {margin.toFixed(1)}%{" "}
          <span className="font-normal text-muted-foreground">
            · {profit >= 0 ? "+" : ""}
            {profit.toFixed(2)} profit
          </span>
        </p>
      </div>
      <div className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-white">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AddItemDialog({ tenantSlug, tenantId, currencySymbol }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema as any),
    defaultValues: { quantity: 0, reorderAt: 5, unitCost: 0, unitPrice: 0 },
  });

  const costVal = useWatch({ control, name: "unitCost" });
  const priceVal = useWatch({ control, name: "unitPrice" });
  const cost = Number(costVal) || 0;
  const price = Number(priceVal) || 0;

  async function onSubmit(data: CreateItemInput) {
    if (!isOnline) {
      toast.error("You're offline. Connect to the internet to add items.");
      return;
    }
    try {
      await createItem(tenantSlug, tenantId, data);
      toast.success(`"${data.name}" added to inventory`);
      if (addAnother) {
        reset({ quantity: 0, reorderAt: 5, unitCost: 0, unitPrice: 0 });
      } else {
        setOpen(false);
        reset();
      }
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add item");
    }
  }

  return (
    <>
      <Button className="rounded-full px-4" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90dvh] w-[min(560px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
        >
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Inventory / New</p>
                <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                  Add item
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6">
              {/* Section 01 — Identity */}
              <DialogFormSection num="01" title="Identity" sub="What it's called and how it's found.">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">
                      Name <span className="text-primary">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Cold Brew Coffee — 250ml"
                      autoFocus
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">SKU</Label>
                    <Input placeholder="ABC-001" {...register("sku")} />
                  </div>
                </div>
              </DialogFormSection>

              {/* Section 02 — Pricing */}
              <DialogFormSection num="02" title="Pricing" sub="Margin updates automatically.">
                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInputField
                    currencySymbol={currencySymbol}
                    label={
                      <>
                        Unit cost <span className="text-primary">*</span>
                      </>
                    }
                    error={errors.unitCost?.message}
                    {...register("unitCost")}
                  />
                  <CurrencyInputField
                    currencySymbol={currencySymbol}
                    label={
                      <>
                        Unit price <span className="text-primary">*</span>
                      </>
                    }
                    error={errors.unitPrice?.message}
                    {...register("unitPrice")}
                  />
                  <div className="col-span-2">
                    <MarginChip cost={cost} price={price} />
                  </div>
                </div>
              </DialogFormSection>

              {/* Section 03 — Inventory */}
              <DialogFormSection num="03" title="Inventory" sub="Stock level and reorder point.">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">
                      Starting quantity
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      {...register("quantity")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label className="text-xs font-medium text-foreground/80">Reorder at</Label>
                      <span className="text-[10px] text-muted-foreground">Alert threshold</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      {...register("reorderAt")}
                    />
                  </div>
                </div>
              </DialogFormSection>

              {/* Section 04 — Details */}
              <DialogFormSection num="04" title="Details" sub="Optional. You can edit later.">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Description</Label>
                  <Textarea
                    placeholder="Short customer-facing description…"
                    rows={3}
                    {...register("description")}
                  />
                </div>
              </DialogFormSection>
            </div>

            {/* Footer */}
            <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 flex-col gap-3 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={addAnother}
                  onChange={(e) => setAddAnother(e.target.checked)}
                />
                Add another after saving
              </label>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                {!isOnline && (
                  <span className="flex items-center gap-1 text-xs text-amber-700">
                    <WifiOff className="h-3.5 w-3.5" /> Offline
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-4"
                  onClick={() => { setOpen(false); reset(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full px-4"
                  disabled={isSubmitting || !isOnline}
                >
                  {isSubmitting ? "Saving…" : "Save item"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
