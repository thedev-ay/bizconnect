"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function AddItemDialog({ tenantSlug, tenantId, currencySymbol }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema as any),
    defaultValues: { quantity: 0, reorderAt: 5, unitCost: 0, unitPrice: 0 },
  });

  async function onSubmit(data: CreateItemInput) {
    if (!isOnline) {
      toast.error("You're offline. Connect to the internet to add items.");
      return;
    }
    try {
      await createItem(tenantSlug, tenantId, data);
      toast.success(`"${data.name}" added to inventory`);
      setOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["inventory", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" />
        Add
      </DialogTrigger>
      <DialogContent className="max-w-xl border border-border/70 bg-popover/98 p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)]">
        <DialogHeader>
          <p className="eyebrow-label">Inventory</p>
          <DialogTitle>Add item</DialogTitle>
          <DialogDescription>New stock unit</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input placeholder="Product name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input placeholder="ABC-001" {...register("sku")} />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={0} {...register("quantity")} />
            </div>
            <div className="space-y-2">
              <Label>Unit Cost ({currencySymbol})</Label>
              <Input type="number" step="0.01" min={0} {...register("unitCost")} />
              {errors.unitCost && (
                <p className="text-sm text-destructive">{errors.unitCost.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Unit Price ({currencySymbol})</Label>
              <Input type="number" step="0.01" min={0} {...register("unitPrice")} />
              {errors.unitPrice && (
                <p className="text-sm text-destructive">{errors.unitPrice.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reorder At (qty)</Label>
              <Input type="number" min={0} {...register("reorderAt")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea placeholder="Optional description" rows={2} {...register("description")} />
            </div>
          </div>
          <DialogFooter>
            {!isOnline && (
              <p className="mr-auto flex items-center gap-1.5 text-xs text-amber-700">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isOnline}>
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
