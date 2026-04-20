"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TENANT_COMPANY_SIZE_OPTIONS,
  TENANT_COUNTRY_OPTIONS,
  TENANT_INDUSTRY_OPTIONS,
  TENANT_PLAN_OPTIONS,
} from "@/lib/tenant-options";

const EMPTY_SELECT_VALUE = "none";

const editTenantProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  plan: z.enum(["starter", "growth", "enterprise"]),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid business email").optional().or(z.literal("")),
  website: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  tags: z.string().optional(),
});

type EditTenantProfileForm = z.infer<typeof editTenantProfileSchema>;

interface EditTenantProfileDialogProps {
  tenant: {
    id: string;
    name: string;
    country: string;
    plan: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    industry: string | null;
    companySize: string | null;
    tags: string[];
  };
}

export function EditTenantProfileDialog({ tenant }: EditTenantProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTenantProfileForm>({
    resolver: zodResolver(editTenantProfileSchema) as any,
    defaultValues: {
      name: tenant.name,
      plan: tenant.plan as EditTenantProfileForm["plan"],
      address: tenant.address ?? "",
      phone: tenant.phone ?? "",
      email: tenant.email ?? "",
      website: tenant.website ?? "",
      industry: tenant.industry ?? "",
      companySize: tenant.companySize ?? "",
      tags: tenant.tags.join(", "),
    },
  });

  const plan = watch("plan");
  const industry = watch("industry");
  const companySize = watch("companySize");
  const tagPreview = (watch("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const selectedPlan = TENANT_PLAN_OPTIONS.find((option) => option.value === plan);
  const selectedCountry = TENANT_COUNTRY_OPTIONS.find((option) => option.value === tenant.country);
  const selectedIndustry = TENANT_INDUSTRY_OPTIONS.find((option) => option.value === industry);
  const selectedCompanySize = TENANT_COMPANY_SIZE_OPTIONS.find((option) => option.value === companySize);

  async function onSubmit(data: EditTenantProfileForm) {
    const website = data.website?.trim();
    const normalizedWebsite = website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        website: normalizedWebsite,
        tags: tagPreview,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to update tenant profile");
      return;
    }

    toast.success("Tenant profile updated");
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset({
        name: tenant.name,
        plan: tenant.plan as EditTenantProfileForm["plan"],
        address: tenant.address ?? "",
        phone: tenant.phone ?? "",
        email: tenant.email ?? "",
        website: tenant.website ?? "",
        industry: tenant.industry ?? "",
        companySize: tenant.companySize ?? "",
        tags: tenant.tags.join(", "),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="rounded-full" />}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit Profile
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5 text-left">
          <p className="admin-eyebrow">Tenant / Profile</p>
          <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
            Edit Tenant Profile
          </DialogTitle>
          <DialogDescription className="mt-1">
            Update business details and directory facets for this tenant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Business Name</Label>
                <Input id="edit-name" placeholder="Acme Corporation" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={plan}
                  onValueChange={(value) => value && setValue("plan", value as EditTenantProfileForm["plan"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan">
                      {selectedPlan?.label ?? "Select a plan"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TENANT_PLAN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <div className="flex h-10 items-center rounded-lg border border-border/70 bg-muted/35 px-3 text-sm text-muted-foreground">
                  {selectedCountry?.label ?? tenant.country.toUpperCase()}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input id="edit-website" placeholder="example.com" {...register("website")} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-address">Business Address</Label>
                <Input id="edit-address" placeholder="Keizersgracht 123, Amsterdam" {...register("address")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Business Phone</Label>
                <Input id="edit-phone" placeholder="+31 20 123 4567" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Business Email</Label>
                <Input id="edit-email" type="email" placeholder="hello@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select
                  value={industry || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value) setValue("industry", value === EMPTY_SELECT_VALUE ? "" : value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry">
                      {selectedIndustry?.label ?? "Select industry"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>Select industry</SelectItem>
                    {TENANT_INDUSTRY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Company Size</Label>
                <Select
                  value={companySize || EMPTY_SELECT_VALUE}
                  onValueChange={(value) => {
                    if (value) setValue("companySize", value === EMPTY_SELECT_VALUE ? "" : value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size">
                      {selectedCompanySize?.label ?? "Select size"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>Select size</SelectItem>
                    {TENANT_COMPANY_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-tags">Tags</Label>
                <Input id="edit-tags" placeholder="pilot, vip, franchise" {...register("tags")} />
                {tagPreview.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tagPreview.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full px-4" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
