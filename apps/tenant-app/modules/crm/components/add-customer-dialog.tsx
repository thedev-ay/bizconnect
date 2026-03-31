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
      <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="juan@example.com" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+63 9XX XXX XXXX" {...register("phone")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input placeholder="Street, City, Province" {...register("address")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tags</Label>
              <Input placeholder="vip, wholesale, retail (comma-separated)" {...register("tags")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any notes about this customer..." rows={2} {...register("notes")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
