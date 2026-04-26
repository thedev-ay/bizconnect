"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CurrencyInputField } from "@/components/ui/currency-input-field";
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInvoiceSchema, type CreateInvoiceInput } from "../schema";
import { createInvoice } from "../actions";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";

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
  useTopbarCta("New Invoice", () => setOpen(true));
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
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" />
        New
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[94dvh] w-[min(96vw,72rem)] max-w-[72rem] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Billing / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">Create invoice</DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon" className="mt-1 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6">
            <DialogFormSection num="01" title="Customer">
              <div className="grid gap-4 sm:grid-cols-2">
                {crmEnabled && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs font-medium text-foreground/80">Customer</Label>
                    <select
                      value={selectedCustomerId ?? ""}
                      onChange={(event) => handleCustomerChange(event.target.value)}
                      className="flex h-10 w-full rounded-2xl border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
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
                  <Label className="text-xs font-medium text-foreground/80">Name *</Label>
                  <Input placeholder="Juan dela Cruz" {...register("customerName")} readOnly={Boolean(selectedCustomerId)} />
                  {errors.customerName && (
                    <p className="text-xs text-destructive">{errors.customerName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground/80">Email</Label>
                  <Input
                    type="email"
                    placeholder="juan@example.com"
                    {...register("customerEmail")}
                    readOnly={Boolean(selectedCustomerId)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-foreground/80">Due Date *</Label>
                  <Input type="date" {...register("dueDate")} />
                  {errors.dueDate && (
                    <p className="text-xs text-destructive">{errors.dueDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground/80">Tax</Label>
                    {defaultTaxRate > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue("tax", Math.round(subtotal * defaultTaxRate) / 100);
                        }}
                        className="text-xs text-zinc-400 transition-colors hover:text-zinc-700"
                      >
                        Apply {defaultTaxRate}%
                      </button>
                    )}
                  </div>
                  <CurrencyInputField
                    currencySymbol={currencySymbol}
                    error={errors.tax?.message}
                    {...register("tax")}
                  />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Line Items">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground/80">Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Line
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="hidden grid-cols-[minmax(0,1.5fr)_90px_170px_40px] gap-3 px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:grid">
                    <span>Description</span>
                    <span>Qty</span>
                    <span>Unit Price</span>
                    <span />
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50/40 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_90px_170px_40px]">
                        <div className="space-y-1">
                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:hidden">Description</p>
                          <Input
                            placeholder="Service or product"
                            {...register(`items.${index}.description`)}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:hidden">Qty</p>
                          <Input
                            type="number"
                            min={1}
                            {...register(`items.${index}.quantity`)}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:hidden">Unit Price</p>
                          <CurrencyInputField
                            currencySymbol={currencySymbol}
                            {...register(`items.${index}.unitPrice`)}
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full text-muted-foreground"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-[20px] border border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm">
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
            </DialogFormSection>

            <DialogFormSection num="03" title="Notes">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground/80">Notes</Label>
                <Textarea placeholder="Optional notes for the customer..." rows={3} {...register("notes")} />
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
