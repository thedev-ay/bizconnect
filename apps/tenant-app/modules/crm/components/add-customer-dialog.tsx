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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-lg border border-slate-200/80 bg-white p-5 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)]">
        <DialogHeader>
          <p className="eyebrow-label text-primary">CRM</p>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-white p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input placeholder="Alex Morgan" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input type="email" placeholder="juan@example.com" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="+31 6 12345678" {...register("phone")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="Street, City, Province" {...register("address")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tags <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input placeholder="vip, wholesale" {...register("tags")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea placeholder="Notes" rows={2} {...register("notes")} />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/80 pt-4">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
