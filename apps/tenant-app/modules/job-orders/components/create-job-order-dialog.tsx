"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2, Scale } from "lucide-react";
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
import { createJobOrder } from "../actions";

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

interface CreateJobOrderDialogProps {
  tenantSlug: string;
  tenantId: string;
  services: ServiceOption[];
  customers: CustomerOption[];
  employees: EmployeeOption[];
  currencySymbol: string;
  currencyLocale: string;
  firstStageSlug: string;
  initialCustomerId?: string;
  disabled?: boolean;
}

export function CreateJobOrderDialog({
  tenantSlug,
  tenantId,
  services,
  customers,
  employees,
  currencySymbol,
  currencyLocale,
  firstStageSlug,
  initialCustomerId,
  disabled,
}: CreateJobOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const router = useRouter();

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateJobOrderInput>({
      resolver: zodResolver(createJobOrderSchema as any),
      defaultValues: { priority: "normal", customerId: initialCustomerId ?? "" },
    });

  const selectedCustomerId = watch("customerId") ?? "";
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);

  function handleClose(o: boolean) {
    if (!o) {
      reset();
      setItems([]);
      setServiceSearch("");
      setSelectedStaffIds([]);
      setValue("customerId", "");
      if (initialCustomerId) {
        const initialCustomer = customers.find((customer) => customer.id === initialCustomerId);
        setValue("customerId", initialCustomerId);
        setValue("customerName", initialCustomer?.name ?? "");
        setValue("contactNo", initialCustomer?.phone ?? "");
      }
    }
    setOpen(o);
  }

  function handleCustomerChange(customerId: string | null) {
    const customer = customers.find((entry) => entry.id === customerId);
    setValue("customerId", customerId ?? "");
    setValue("customerName", customer?.name ?? "");
    setValue("contactNo", customer?.phone ?? "");
  }

  useEffect(() => {
    if (!open || !initialCustomerId) return;
    handleCustomerChange(initialCustomerId);
  }, [open, initialCustomerId]);

  function addService(svc: ServiceOption) {
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.name === svc.name);
      if (existing >= 0) {
        if (svc.pricingType === "per_kilo") return prev;
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          quantity: updated[existing].quantity + 1,
          total: (updated[existing].quantity + 1) * svc.price,
        };
        return updated;
      }
      if (svc.pricingType === "per_kilo") {
        return [...prev, { id: crypto.randomUUID(), name: svc.name, quantity: 1, weight: 0, unitPrice: svc.price, total: 0, pricingType: "per_kilo" as const, isCustom: false }];
      }
      return [...prev, { id: crypto.randomUUID(), name: svc.name, quantity: 1, unitPrice: svc.price, total: svc.price, pricingType: svc.pricingType, isCustom: false }];
    });
  }

  function addCustomCharge() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
        pricingType: "per_piece" as const,
        isCustom: true,
      },
    ]);
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

  const filteredServices = services.filter((s) => {
    const q = serviceSearch.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q);
  });

  const incompleteWeights = items.filter((i) => i.pricingType === "per_kilo" && (!i.weight || i.weight <= 0));
  const invalidCustomCharges = items.filter((i) => i.isCustom && (!i.name.trim() || i.unitPrice <= 0));

  async function onSubmit(data: CreateJobOrderInput) {
    if (incompleteWeights.length > 0) {
      toast.error(`Enter weight for: ${incompleteWeights.map((i) => i.name).join(", ")}`);
      return;
    }
    if (invalidCustomCharges.length > 0) {
      toast.error("Complete each custom charge with a name and price");
      return;
    }
    try {
      await createJobOrder(tenantSlug, tenantId, {
        ...data,
        assignedStaffIds: selectedStaffIds,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          weight: i.pricingType === "per_kilo" ? i.weight : undefined,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
      }, firstStageSlug);
      toast.success("Job order created");
      handleClose(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create job order");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button disabled={disabled} title={disabled ? "Set up your workflow before creating job orders" : undefined} />}>
        <Plus className="mr-2 h-4 w-4" />
        New Job Order
      </DialogTrigger>
      <DialogContent className="max-w-2xl min-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Job Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Customer */}
          <div className="grid gap-4 sm:grid-cols-2">
            {customers.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Existing Customer</Label>
                <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
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
                <p className="text-xs text-zinc-500">
                  Start from a CRM customer to keep job orders and billing tied to the same record.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input placeholder="Alex Morgan" {...register("customerName")} readOnly={Boolean(selectedCustomerId)} />
              {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact No. <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <Input placeholder="+31 6 12345678" {...register("contactNo")} readOnly={Boolean(selectedCustomerId)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <Input placeholder="Special instructions..." {...register("notes")} />
            </div>
          </div>

          <Separator />

          {/* Services */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Charges</p>
                <p className="text-xs text-zinc-500">
                  Add predefined services or enter manual charges for one-off work.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCustomCharge}>
                <Plus className="mr-1 h-3 w-3" />
                Custom Charge
              </Button>
            </div>
            {services.length > 0 ? (
              <div className="space-y-2">
                <Input
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {filteredServices.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => addService(svc)}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                    >
                      {svc.name}
                      {svc.pricingType === "per_kilo" && <Scale className="ml-1 inline h-3 w-3 text-zinc-400" />}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
                No service templates yet. Use <span className="font-medium text-zinc-700">Custom Charge</span> to add billable work manually.
              </div>
            )}

            {/* Line items */}
            {items.length > 0 && (
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      {item.isCustom ? (
                        <Input
                          value={item.name}
                          onChange={(e) => updateName(idx, e.target.value)}
                          placeholder="Custom charge name"
                          className="h-8 text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                      )}
                      {item.pricingType === "per_kilo" ? (
                        <div className="flex items-center gap-1.5 mt-1">
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
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => updateQty(idx, -1)}
                          className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-xs">−</button>
                        <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => updateQty(idx, 1)}
                          className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-xs">+</button>
                      </div>
                    )}
                    <span className="w-16 text-right text-sm font-semibold tabular-nums text-zinc-800">
                      {currencySymbol}{item.total.toFixed(2)}
                    </span>
                    <button type="button" onClick={() => removeItem(idx)} className="text-zinc-300 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-zinc-50 font-semibold text-sm text-zinc-800">
                  <span>Total</span>
                  <span className="tabular-nums">{currencySymbol}{grandTotal.toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Priority, due date, staff */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => {
                  const priorityLabels: Record<string, string> = {
                    low: "Low",
                    normal: "Normal",
                    high: "High",
                    urgent: "Urgent",
                  };
                  return (
                    <Select value={field.value} onValueChange={(v) => { if (v) field.onChange(v); }}>
                      <SelectTrigger>
                        {field.value ? priorityLabels[field.value] : <span className="text-muted-foreground">Select...</span>}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
          </div>
          {employees.length > 0 && (
            <div className="space-y-2">
              <Label>Assign Staff <span className="text-zinc-400 font-normal">(optional)</span></Label>
              <div className="max-h-28 overflow-y-auto rounded-md border border-zinc-200 divide-y divide-zinc-100">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-zinc-50">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
