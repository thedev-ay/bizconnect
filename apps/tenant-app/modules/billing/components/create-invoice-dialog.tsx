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

interface CustomerOption {
  id: string;
  name: string;
  email: string | null;
}

interface CreateInvoiceDialogProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
  defaultTaxRate: number;
  customers: CustomerOption[];
  crmEnabled: boolean;
}

export function CreateInvoiceDialog({
  tenantSlug,
  tenantId,
  currencySymbol,
  defaultTaxRate,
  customers,
  crmEnabled,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema as any),
    defaultValues: {
      tax: 0,
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
      },
  });

  const selectedCustomerId = watch("customerId");

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

  function handleCustomerChange(customerId: string) {
    const customer = customers.find((entry) => entry.id === customerId);
    setValue("customerId", customerId);
    setValue("customerName", customer?.name ?? "");
    setValue("customerEmail", customer?.email ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Invoice
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="max-h-[calc(92vh-10rem)] overflow-y-auto pr-2">
          <div className="grid gap-5 sm:grid-cols-2">
            {crmEnabled && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Existing Customer</Label>
                <select
                  value={selectedCustomerId ?? ""}
                  onChange={(event) => handleCustomerChange(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="">Select a customer from CRM</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{customer.email ? ` · ${customer.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register("customerName")} readOnly={Boolean(selectedCustomerId)} />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Customer Email</Label>
              <Input
                type="email"
                placeholder="juan@example.com"
                {...register("customerEmail")}
                readOnly={Boolean(selectedCustomerId)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" {...register("dueDate")} />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tax ({currencySymbol})</Label>
                {defaultTaxRate > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setValue("tax", Math.round(subtotal * defaultTaxRate) / 100);
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    Apply {defaultTaxRate}%
                  </button>
                )}
              </div>
              <Input type="number" step="0.01" min={0} {...register("tax")} />
            </div>
          </div>

          <Separator className="my-5" />

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
              <div className="grid grid-cols-[minmax(0,1.5fr)_90px_130px_40px] gap-3 text-xs font-medium text-muted-foreground">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span />
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[minmax(0,1.5fr)_90px_130px_40px] gap-3">
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
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{currencySymbol}{Number(watchedTax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{currencySymbol}{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes for the customer..." rows={2} {...register("notes")} />
          </div>
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
