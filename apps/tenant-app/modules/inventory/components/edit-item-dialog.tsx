"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  const router = useRouter();

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
    try {
      await updateItem(tenantSlug, tenantId, item.id, data);
      toast.success(`"${item.name}" updated`);
      onOpenChange(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input {...register("sku")} />
            </div>
            <div className="space-y-2">
              <Label>Reorder At (qty)</Label>
              <Input type="number" min={0} {...register("reorderAt")} />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost ({currencySymbol})</Label>
              <Input type="number" step="0.01" min={0} {...register("unitCost")} />
              {errors.unitCost && <p className="text-sm text-destructive">{errors.unitCost.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Unit Price ({currencySymbol})</Label>
              <Input type="number" step="0.01" min={0} {...register("unitPrice")} />
              {errors.unitPrice && <p className="text-sm text-destructive">{errors.unitPrice.message}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} {...register("description")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
