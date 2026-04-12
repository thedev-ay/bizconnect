"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Scale, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createJobOrderSchema, type CreateJobOrderInput } from "../schema";
import { updateJobOrder } from "../actions";
import type { JobOrder } from "../types";

interface ServiceOption {
  id: string;
  name: string;
  pricingType: "per_piece" | "per_kilo" | "flat";
  price: number;
  category: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  weight?: number;
  unitPrice: number;
  total: number;
  pricingType: "per_piece" | "per_kilo" | "flat";
  isCustom?: boolean;
}

interface EmployeeOption {
  id: string;
  name: string;
}

interface EditJobOrderDialogProps {
  jobOrder: JobOrder;
  tenantSlug: string;
  tenantId: string;
  services: ServiceOption[];
  customers: CustomerOption[];
  employees: EmployeeOption[];
  currencySymbol: string;
  currencyLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditJobOrderDialog({
  jobOrder,
  tenantSlug,
  tenantId,
  services,
  customers,
  employees,
  currencySymbol,
  currencyLocale,
  open,
  onOpenChange,
}: EditJobOrderDialogProps) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(() =>
    jobOrder.assignedStaff.map((s) => s.employeeId)
  );

  // Initialise line items from existing job order items
  function buildItems(): LineItem[] {
    return jobOrder.items.map((i) => {
      const kg = i.weight != null ? Number(i.weight) : undefined;
      const pricingType = kg != null ? "per_kilo" : "per_piece";
      return {
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        weight: kg,
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
        pricingType,
        isCustom: true,
      };
    });
  }

  const [items, setItems] = useState<LineItem[]>(buildItems);

  useEffect(() => {
    if (open) {
      setItems(buildItems());
      setServiceSearch("");
      setSelectedStaffIds(jobOrder.assignedStaff.map((s) => s.employeeId));
    }
  }, [open]);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateJobOrderInput>({
      resolver: zodResolver(createJobOrderSchema as any),
      defaultValues: {
        customerId: jobOrder.customerId ?? "",
        customerName: jobOrder.customerName,
        contactNo: jobOrder.contactNo ?? "",
        notes: jobOrder.notes ?? "",
        priority: jobOrder.priority as any,
        dueDate: jobOrder.dueDate ? new Date(jobOrder.dueDate).toISOString().slice(0, 10) : "",
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        customerId: jobOrder.customerId ?? "",
        customerName: jobOrder.customerName,
        contactNo: jobOrder.contactNo ?? "",
        notes: jobOrder.notes ?? "",
        priority: jobOrder.priority as any,
        dueDate: jobOrder.dueDate ? new Date(jobOrder.dueDate).toISOString().slice(0, 10) : "",
      });
    }
  }, [open]);

  function addService(svc: ServiceOption | ComboboxOption) {
    const service = "pricingType" in svc
      ? svc
      : services.find((entry) => entry.id === svc.value);

    if (!service) return;

    setItems((prev) => {
      const existing = prev.findIndex((i) => i.name === service.name);
      if (existing >= 0) {
        if (service.pricingType === "per_kilo") return prev;
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1, total: (updated[existing].quantity + 1) * service.price };
        return updated;
      }
      if (service.pricingType === "per_kilo") {
        return [...prev, { id: crypto.randomUUID(), name: service.name, quantity: 1, weight: 0, unitPrice: service.price, total: 0, pricingType: "per_kilo", isCustom: false }];
      }
      return [...prev, { id: crypto.randomUUID(), name: service.name, quantity: 1, unitPrice: service.price, total: service.price, pricingType: service.pricingType, isCustom: false }];
    });
    setServiceSearch("");
  }

  function addCustomCharge(name = "") {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        quantity: 1,
        unitPrice: 0,
        total: 0,
        pricingType: "per_piece" as const,
        isCustom: true,
      },
    ]);
    setServiceSearch("");
  }

  function updateWeight(index: number, kg: number) {
    setItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, weight: kg, total: kg * item.unitPrice } : item
    ));
  }

  function updateQty(index: number, delta: number) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty, total: newQty * item.unitPrice };
    }));
  }

  function updateName(index: number, name: string) {
    setItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, name } : item
    ));
  }

  function updateUnitPrice(index: number, unitPrice: number) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const total = item.pricingType === "per_kilo"
        ? (item.weight ?? 0) * unitPrice
        : item.quantity * unitPrice;
      return { ...item, unitPrice, total };
    }));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const grandTotal = items.reduce((s, i) => s + i.total, 0);
  const incompleteWeights = items.filter((i) => i.pricingType === "per_kilo" && (!i.weight || i.weight <= 0));
  const invalidCustomCharges = items.filter((i) => i.isCustom && (!i.name.trim() || i.unitPrice <= 0));
  const selectedCustomerId = watch("customerId");
  const normalizedCustomerId = selectedCustomerId ?? "";
  const selectedCustomer = customers.find((customer) => customer.id === normalizedCustomerId);

  const normalizedServiceSearch = serviceSearch.trim().toLowerCase();
  const exactServiceMatch = normalizedServiceSearch
    ? services.find((service) => service.name.trim().toLowerCase() === normalizedServiceSearch) ?? null
    : null;
  const serviceComboboxOptions: ComboboxOption[] = services.map((service) => ({
    value: service.id,
    label: service.name,
    description: `${service.pricingType === "per_kilo" ? "Per kilo" : service.pricingType === "flat" ? "Flat" : "Per piece"} · ${currencySymbol}${service.price.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}${service.category ? ` · ${service.category}` : ""}`,
    searchText: service.category ?? "",
  }));

  async function onSubmit(data: CreateJobOrderInput) {
    if (!isOnline) {
      toast.error("You're offline. Connect to update job orders.");
      return;
    }
    if (incompleteWeights.length > 0) {
      toast.error(`Enter weight for: ${incompleteWeights.map((i) => i.name).join(", ")}`);
      return;
    }
    if (invalidCustomCharges.length > 0) {
      toast.error("Complete each custom charge with a name and price");
      return;
    }
    try {
      await updateJobOrder(tenantSlug, tenantId, jobOrder.id, {
        ...data,
        assignedStaffIds: selectedStaffIds,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          weight: i.pricingType === "per_kilo" ? i.weight : undefined,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      });
      toast.success("Job order updated");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  function handleCustomerChange(customerId: string | null) {
    const customer = customers.find((entry) => entry.id === customerId);
    setValue("customerId", customerId ?? "");
    setValue("customerName", customer?.name ?? "");
    setValue("contactNo", customer?.phone ?? "");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden border border-border/70 bg-popover/98 p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.42)] sm:w-[min(96vw,56rem)]">
        <DialogHeader className="border-b border-border/60 px-4 pb-4 pt-4 sm:px-5">
          <div className="space-y-1">
            <p className="eyebrow-label">Job Order</p>
            <DialogTitle>Edit</DialogTitle>
            <DialogDescription>{jobOrder.jobNo}</DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          <section className="space-y-4 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <div>
              <p className="eyebrow-label">Customer</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">Info</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
            {customers.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Customer</Label>
                <Select value={normalizedCustomerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    {selectedCustomer
                      ? `${selectedCustomer.name}${selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}`
                      : <SelectValue placeholder="Select a customer from CRM" />}
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Alex Morgan"
                {...register("customerName")}
                readOnly={Boolean(selectedCustomerId)}
              />
              {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="+31 6 12345678"
                {...register("contactNo")}
                readOnly={Boolean(selectedCustomerId)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="Special instructions..."
                {...register("notes")}
              />
            </div>
          </div>
          </section>

          <Separator />

          <section className="space-y-3 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <div>
              <p className="eyebrow-label">Charges</p>
              <p className="text-sm font-semibold text-foreground">Charges</p>
            </div>
            {services.length > 0 ? (
              <div className="space-y-2">
                <Combobox
                  options={serviceComboboxOptions}
                  value={serviceSearch}
                  onValueChange={setServiceSearch}
                  onSelect={addService}
                  placeholder="Search services or type a custom charge..."
                  emptyMessage="No matching services found."
                  helperText="Select an existing service, or type a custom charge for a one-off item."
                  renderOption={(option) => {
                    const service = services.find((entry) => entry.id === option.value);
                    return (
                      <>
                        <span className="font-medium text-foreground">
                          {option.label}
                          {service?.pricingType === "per_kilo" ? <Scale className="ml-1 inline h-3 w-3 text-muted-foreground" /> : null}
                        </span>
                        {option.description ? (
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        ) : null}
                      </>
                    );
                  }}
                  footer={serviceSearch.trim() && !exactServiceMatch ? (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Add custom charge "{serviceSearch.trim()}"</p>
                        <p className="text-xs text-muted-foreground">Creates a one-off charge for this job order only.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addCustomCharge(serviceSearch.trim())}
                      >
                        Add custom
                      </Button>
                    </div>
                  ) : null}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
                No service templates yet. Type a custom charge to add billable work manually.
              </div>
            )}

            {items.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                {items.map((item, idx) => (
                  <div key={item.id} className="grid gap-3 border-b border-zinc-100 px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.8fr)_auto_auto_auto] md:items-center">
                    <div className="min-w-0">
                      {item.isCustom ? (
                        <Input
                          value={item.name}
                          onChange={(e) => updateName(idx, e.target.value)}
                          placeholder="Custom charge"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                      )}
                      {item.pricingType === "per_kilo" ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            placeholder="Enter kg"
                            value={item.weight || ""}
                            onChange={(e) => updateWeight(idx, parseFloat(e.target.value) || 0)}
                            className={cn(
                              "h-6 w-24 text-xs",
                              (!item.weight || item.weight <= 0) && "border-amber-400 focus-visible:ring-amber-400"
                            )}
                          />
                          <span className="text-xs text-zinc-400">kg × {currencySymbol}{item.unitPrice.toFixed(2)}/kg</span>
                          {(!item.weight || item.weight <= 0) && (
                            <span className="text-[10px] font-medium text-amber-600">weight required</span>
                          )}
                        </div>
                      ) : item.isCustom ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.unitPrice || ""}
                            onChange={(e) => updateUnitPrice(idx, parseFloat(e.target.value) || 0)}
                            className="h-6 w-24 text-xs"
                          />
                          <span className="text-xs text-zinc-400">unit price</span>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400">{currencySymbol}{item.unitPrice.toFixed(2)} each</p>
                      )}
                    </div>
                    {item.pricingType !== "per_kilo" && (
                      <div className="flex items-center gap-1 md:justify-self-start">
                        <button
                          type="button"
                          onClick={() => updateQty(idx, -1)}
                          className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-semibold text-zinc-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(idx, 1)}
                          className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <span className="text-sm font-semibold tabular-nums text-zinc-800 md:min-w-[88px] md:text-right">
                      {currencySymbol}{item.total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-zinc-300 hover:text-red-400 md:justify-self-end"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
                  <span>Total</span>
                  <span className="tabular-nums">{currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-4 rounded-[24px] border border-border/60 bg-background/62 p-4">
            <div>
              <p className="eyebrow-label">Handling</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">Priority</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                    <SelectTrigger>
                      <SelectValue>
                        {{ low: "Low", normal: "Normal", high: "High", urgent: "Urgent" }[field.value] ?? field.value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Due</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
          </div>
          {employees.length > 0 && (
            <div className="space-y-2">
              <Label>Assign Staff <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <div className="max-h-28 overflow-y-auto rounded-md border border-zinc-200 divide-y divide-zinc-100">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selectedStaffIds.includes(emp.id)}
                      onChange={(e) =>
                        setSelectedStaffIds((prev) =>
                          e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)
                        )
                      }
                    />
                    <span className="text-sm text-zinc-700">{emp.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          </section>
          </div>

          <DialogFooter className="border-t border-border/60 bg-background/95 px-4 py-3 sm:px-5">
            {!isOnline && (
              <p className="mr-auto flex items-center gap-1.5 text-xs text-amber-600">
                <WifiOff className="h-3.5 w-3.5" /> Offline
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isOnline}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
