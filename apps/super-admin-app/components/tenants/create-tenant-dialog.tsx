"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BriefcaseBusiness, Plus, ShoppingBag } from "lucide-react";
import { SUPPORTED_COUNTRIES } from "@bizconnect/db";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  country: z.string().default("nl"),
  preset: z.enum(["service-shop", "retail"]).default("service-shop"),
  plan: z.enum(["starter", "growth", "enterprise"]),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
  adminEmail: z.string().email("Enter a valid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  includeInventory: z.boolean().default(false),
  includeBilling: z.boolean().default(false),
  includeLoyalty: z.boolean().default(false),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
] as const;

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema) as any,
    defaultValues: {
      country: "nl",
      preset: "service-shop",
      plan: "starter",
      includeInventory: false,
      includeBilling: false,
      includeLoyalty: false,
    },
  });

  const preset = watch("preset");
  const country = watch("country");
  const plan = watch("plan");
  const selectedCountry = SUPPORTED_COUNTRIES.find((option) => option.value === country);
  const selectedPlan = PLAN_OPTIONS.find((option) => option.value === plan);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setValue("slug", slug);
  }

  async function onSubmit(data: CreateTenantForm) {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create tenant");
      return;
    }

    toast.success(`Tenant "${data.name}" created successfully`);
    setOpen(false);
    setStep(1);
    reset();
    router.refresh();
  }

  async function handleNextStep() {
    const isValid = await trigger(["name", "slug", "country", "preset", "plan"]);
    if (!isValid) {
      toast.error("Please complete the business setup before continuing");
      return;
    }
    setStep(2);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setStep(1);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Tenant
      </DialogTrigger>
      <DialogContent className="grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-5xl lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Step {step} of 2. {step === 1
              ? "Set up the business and choose a launch preset."
              : "Create the first owner account and review the setup."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
          <div className="min-h-0 overflow-y-auto pr-2">
            {step === 1 ? (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name</Label>
                    <Input
                      id="name"
                      placeholder="Acme Corporation"
                      {...register("name", { onChange: handleNameChange })}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input id="slug" placeholder="acme-corporation" {...register("slug")} />
                    {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                    <p className="text-xs text-muted-foreground">
                      Used in the URL: app.bizconnect.app/<strong>{watch("slug") || "slug"}</strong>
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={country} onValueChange={(value) => setValue("country", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country">
                            {selectedCountry?.label ?? "Select a country"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_COUNTRIES.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Plan</Label>
                      <Select value={plan} onValueChange={(value) => setValue("plan", value as CreateTenantForm["plan"])}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan">
                            {selectedPlan?.label ?? "Select a plan"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Vertical Preset</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setValue("preset", "service-shop")}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          preset === "service-shop"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2 ${preset === "service-shop" ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                            <BriefcaseBusiness className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Service Shop</p>
                            <p className={`text-xs ${preset === "service-shop" ? "text-zinc-200" : "text-zinc-500"}`}>
                              CRM, services, job orders, billing, and reports.
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setValue("preset", "retail")}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          preset === "retail"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-2 ${preset === "retail" ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                            <ShoppingBag className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Retail</p>
                            <p className={`text-xs ${preset === "retail" ? "text-zinc-200" : "text-zinc-500"}`}>
                              Inventory, POS, promotions, and reports, with optional billing.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                    {preset === "service-shop" ? (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-zinc-900 p-2 text-white">
                            <BriefcaseBusiness className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-zinc-900">Service shop preset</p>
                            <p className="text-xs text-zinc-500">
                              Includes CRM, services, job orders, billing, reports, and a ready-to-use workflow.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Add inventory</p>
                            <p className="text-xs text-zinc-500">
                              Enable parts and material tracking for repair workflows.
                            </p>
                          </div>
                          <Switch
                            checked={watch("includeInventory")}
                            onCheckedChange={(checked) => setValue("includeInventory", checked)}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-zinc-900 p-2 text-white">
                            <ShoppingBag className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-zinc-900">Retail preset</p>
                            <p className="text-xs text-zinc-500">
                              Includes inventory, POS, promotions, reports, starter products, and an opening-week promo.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Add billing</p>
                            <p className="text-xs text-zinc-500">
                              Enable formal invoices for charge accounts and pay-later sales.
                            </p>
                          </div>
                          <Switch
                            checked={watch("includeBilling")}
                            onCheckedChange={(checked) => setValue("includeBilling", checked)}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Add loyalty</p>
                            <p className="text-xs text-zinc-500">
                              Enable loyalty cards and starter rewards for repeat customers.
                            </p>
                          </div>
                          <Switch
                            checked={watch("includeLoyalty")}
                            onCheckedChange={(checked) => setValue("includeLoyalty", checked)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-5 rounded-lg border border-zinc-200 p-5">
                  <p className="text-sm font-semibold text-zinc-900">What this will create</p>
                  <ul className="space-y-2 text-sm text-zinc-600">
                    <li>Business: <span className="font-medium text-zinc-900">{watch("name") || "Your business"}</span></li>
                    <li>URL slug: <span className="font-mono text-zinc-900">{watch("slug") || "slug"}</span></li>
                    <li>Preset: <span className="font-medium text-zinc-900">{preset === "service-shop" ? "Service Shop" : "Retail"}</span></li>
                    <li>Plan: <span className="font-medium text-zinc-900">{selectedPlan?.label ?? "Starter"}</span></li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-5 rounded-lg border border-zinc-200 p-5">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Initial tenant owner</p>
                    <p className="text-xs text-zinc-500">
                      This account can sign in right away and finish setup inside the tenant app.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminName">Full Name</Label>
                    <Input id="adminName" placeholder="Alex Morgan" {...register("adminName")} />
                    {errors.adminName && (
                      <p className="text-sm text-destructive">{errors.adminName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input id="adminEmail" type="email" placeholder="alex@example.com" {...register("adminEmail")} />
                    {errors.adminEmail && (
                      <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Password</Label>
                    <Input id="adminPassword" type="password" placeholder="Minimum 8 characters" {...register("adminPassword")} />
                    {errors.adminPassword && (
                      <p className="text-sm text-destructive">{errors.adminPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-5 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Review setup</p>
                    <p className="text-xs text-zinc-500">
                      Double-check the business setup before creating the tenant.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-md border border-zinc-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Business</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{watch("name") || "Your business"}</p>
                      <p className="mt-1 text-xs text-zinc-500">app.bizconnect.app/{watch("slug") || "slug"}</p>
                    </div>

                    <div className="rounded-md border border-zinc-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Preset</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {preset === "service-shop" ? "Service Shop" : "Retail"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">{selectedPlan?.label ?? "Starter"} plan</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Modules & options</p>
                    <div className="mt-2 space-y-2 text-sm text-zinc-600">
                      {preset === "service-shop" ? (
                        <>
                          <p>Includes CRM, services, job orders, billing, reports, and users.</p>
                          <p>{watch("includeInventory") ? "Inventory will also be enabled." : "Inventory will stay off for now."}</p>
                        </>
                      ) : (
                        <>
                          <p>Includes inventory, POS, promotions, reports, and users.</p>
                          <p>{watch("includeBilling") ? "Billing will also be enabled." : "Billing will stay off for now."}</p>
                          <p>{watch("includeLoyalty") ? "Loyalty will also be enabled." : "Loyalty will stay off for now."}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Owner account</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{watch("adminName") || "Owner name"}</p>
                    <p className="mt-1 text-xs text-zinc-500">{watch("adminEmail") || "owner@example.com"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleNextStep}>
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Tenant"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
