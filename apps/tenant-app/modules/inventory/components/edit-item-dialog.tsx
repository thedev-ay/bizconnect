"use client";

import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/use-online-status";
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
import { updateItemSchema, type UpdateItemInput } from "../schema";
import { updateItem } from "../actions";
import type { InventoryItem } from "../types";

interface EditItemDialogProps {
  item: InventoryItem;
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditItemDialog({ item, tenantSlug, tenantId, currencySymbol, open, onOpenChange }: EditItemDialogProps) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateItemInput>({
    resolver: zodResolver(updateItemSchema as any),
    defaultValues: {
      name: item.name,
      sku: item.sku ?? "",
      description: item.description ?? "",
      unitCost: Number(item.unitCost),
      unitPrice: Number(item.unitPrice),
      reorderAt: item.reorderAt,
    },
  });

  async function onSubmit(data: UpdateItemInput) {
    if (!isOnline) {
      toast.error("You're offline. Connect to the internet to save changes.");
      return;
    }
    try {
      await updateItem(tenantSlug, tenantId, item.id, data);
      toast.success(`"${item.name}" updated`);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(560px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Inventory / Edit</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Edit item
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-foreground/80">Name</Label>
                  <Input {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">SKU</Label>
                  <Input {...register("sku")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Pricing">
              <div className="grid gap-3 sm:grid-cols-2">
                <CurrencyInputField
                  currencySymbol={currencySymbol}
                  label="Unit cost"
                  error={errors.unitCost?.message}
                  {...register("unitCost")}
                />
                <CurrencyInputField
                  currencySymbol={currencySymbol}
                  label="Unit price"
                  error={errors.unitPrice?.message}
                  {...register("unitPrice")}
                />
              </div>
            </DialogFormSection>

            <DialogFormSection num="03" title="Inventory">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Reorder At (qty)</Label>
                  <Input type="number" min={0} {...register("reorderAt")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="04" title="Details">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/80">Description</Label>
                <Textarea rows={2} {...register("description")} />
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            {!isOnline && (
              <p className="mr-auto flex items-center gap-1.5 text-xs text-amber-700">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="min-w-24 rounded-full px-4"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
