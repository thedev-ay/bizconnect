"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBusinessProfile } from "../actions";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface BusinessProfileFormProps {
  tenantSlug: string;
  tenantId: string;
  defaultValues: FormData;
}

export function BusinessProfileForm({ tenantSlug, tenantId, defaultValues }: BusinessProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      await updateBusinessProfile(tenantSlug, tenantId, data);
      toast.success("Business profile saved");
      router.refresh();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium text-foreground">Business Name *</Label>
          <Input {...register("name")} placeholder="Northwind Service Co." />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium text-foreground">Address</Label>
          <Input {...register("address")} placeholder="123 Main Street, City" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Phone</Label>
          <Input {...register("phone")} placeholder="+31 6 12345678" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">Email</Label>
          <Input type="email" {...register("email")} placeholder="hello@yourbusiness.com" />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" className="rounded-full" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
