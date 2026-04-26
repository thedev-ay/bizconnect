"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import { createEmployeeSchema, type CreateEmployeeInput } from "../schema";
import { createEmployee } from "../actions";
import { useTopbarCta } from "@/components/layout/topbar-cta-context";

interface AddEmployeeDialogProps {
  tenantSlug: string;
  tenantId: string;
  currencySymbol: string;
}

export function AddEmployeeDialog({ tenantSlug, tenantId, currencySymbol }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  useTopbarCta("Add Employee", () => setOpen(true));
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema as any),
  });

  async function onSubmit(data: CreateEmployeeInput) {
    try {
      await createEmployee(tenantSlug, tenantId, data);
      toast.success("Employee added");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add employee");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="rounded-full px-4" />}>
        <Plus className="mr-2 h-4 w-4" />
        New
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-[min(680px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">HR / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Add employee
              </DialogTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
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
                  <Label className="text-xs font-medium text-foreground/80">Name *</Label>
                  <Input placeholder="Alex Morgan" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    No. <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="Auto-generated if blank" {...register("employeeNo")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Email <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input type="email" placeholder="juan@company.com" {...register("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="+31 6 12345678" {...register("phone")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Role">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Position <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="e.g. Cashier, Manager" {...register("position")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Department <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="e.g. Operations" {...register("department")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="03" title="Employment">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Hire Date <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input type="date" {...register("hireDate")} />
                </div>
                <CurrencyInputField
                  currencySymbol={currencySymbol}
                  label={
                    <>
                      Salary <span className="font-normal text-muted-foreground">(optional)</span>
                    </>
                  }
                  error={errors.salary?.message}
                  {...register("salary")}
                />
              </div>
            </DialogFormSection>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
