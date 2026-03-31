"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { createInvoiceSchema, type CreateInvoiceInput } from "../schema";
import { createInvoice } from "../actions";

interface CreateInvoiceDialogProps {
  tenantSlug: string;
  tenantId: string;
}

export function CreateInvoiceDialog({ tenantSlug, tenantId }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema as any),
    defaultValues: {
      tax: 0,
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const watchedTax = watch("tax");
  const subtotal = watchedItems?.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  ) ?? 0;
  const total = subtotal + (Number(watchedTax) || 0);

  async function onSubmit(data: CreateInvoiceInput) {
    try {
      await createInvoice(tenantSlug, tenantId, data);
      toast.success("Invoice created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoice");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Invoice
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register("customerName")} />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Customer Email</Label>
              <Input type="email" placeholder="juan@example.com" {...register("customerEmail")} />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tax (₱)</Label>
              <Input type="number" step="0.01" min={0} {...register("tax")} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Line
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span />
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2">
                  <Input
                    placeholder="Service or product"
                    {...register(`items.${index}.description`)}
                  />
                  <Input
                    type="number"
                    min={1}
                    {...register(`items.${index}.quantity`)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...register(`items.${index}.unitPrice`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8 text-muted-foreground"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>₱{Number(watchedTax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes for the customer..." rows={2} {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
