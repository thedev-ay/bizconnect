"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { DialogFormSection } from "@/components/ui/dialog-form-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCustomerSchema, type CreateCustomerInput } from "../schema";
import { createCustomer } from "../actions";

interface AddCustomerDialogProps {
  tenantSlug: string;
  tenantId: string;
}

export function AddCustomerDialog({ tenantSlug, tenantId }: AddCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
  });

  async function onSubmit(data: CreateCustomerInput) {
    try {
      await createCustomer(tenantSlug, tenantId, data);
      await queryClient.invalidateQueries({ queryKey: ["job-orders", tenantSlug] });
      toast.success("Customer added");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add customer");
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
              <p className="eyebrow-label">CRM / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Add customer
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
                    Email <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input type="email" placeholder="juan@example.com" {...register("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="+31 6 12345678" {...register("phone")} />
                </div>
              </div>
            </DialogFormSection>

            <DialogFormSection num="02" title="Details">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Address <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="Street, City, Province" {...register("address")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Tags <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input placeholder="vip, wholesale" {...register("tags")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">
                    Notes <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea placeholder="Notes" rows={2} {...register("notes")} />
                </div>
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
