"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const router = useRouter();

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
    try {
      await createItem(tenantSlug, tenantId, data);
      toast.success(`"${data.name}" added to inventory`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
