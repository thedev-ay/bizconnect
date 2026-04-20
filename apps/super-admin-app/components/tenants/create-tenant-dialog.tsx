"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BriefcaseBusiness, Lock, Plus, ShoppingBag, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  TENANT_COMPANY_SIZE_OPTIONS,
  TENANT_COUNTRY_OPTIONS,
  TENANT_INDUSTRY_OPTIONS,
  TENANT_PLAN_OPTIONS,
} from "@/lib/tenant-options";
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
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid business email").optional().or(z.literal("")),
  website: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  tags: z.string().optional(),
  preset: z.enum(["service-shop", "retail"]).default("service-shop"),
  plan: z.enum(["starter", "growth", "enterprise"]),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
  adminEmail: z.string().email("Enter a valid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  moduleSlugs: z.array(z.string()).min(1, "Select at least one module"),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;
type Preset = CreateTenantForm["preset"];
type ModuleSlug =
  | "users"
  | "inventory"
  | "pos"
  | "promotions"
  | "appointments"
  | "billing"
  | "hr"
  | "reports"
  | "job-orders"
  | "crm"
  | "assets"
  | "services"
  | "loyalty";

const MODULE_OPTIONS: Array<{
  slug: ModuleSlug;
  name: string;
  description: string;
  core?: boolean;
}> = [
  { slug: "users", name: "User Management", description: "Roles, permissions, and account access.", core: true },
  { slug: "crm", name: "CRM", description: "Customer records, history, and communications." },
  { slug: "assets", name: "Assets", description: "Customer-linked equipment, vehicles, or serviceable assets." },
  { slug: "services", name: "Services", description: "Service catalog, pricing, and availability flags." },
  { slug: "job-orders", name: "Job Orders", description: "Service workflow, assignments, and job status tracking." },
  { slug: "inventory", name: "Inventory", description: "Stock, products, categories, and reorder points." },
  { slug: "pos", name: "Point of Sale", description: "Walk-in sales, cart, payments, and receipts." },
  { slug: "promotions", name: "Promotions", description: "Discounts and item-level promo campaigns." },
  { slug: "appointments", name: "Appointments", description: "Calendar bookings, services, and staff availability." },
  { slug: "billing", name: "Billing & Invoicing", description: "Invoices, payments, and balances." },
  { slug: "hr", name: "HR & Staff", description: "Employees, scheduling, attendance, leave, and payroll." },
  { slug: "reports", name: "Reports & Analytics", description: "Revenue, inventory, and performance reporting." },
  { slug: "loyalty", name: "Loyalty", description: "Stamp cards, rewards, and redemptions." },
];

const PRESET_MODULES: Record<Preset, ModuleSlug[]> = {
  "service-shop": ["users", "crm", "assets", "services", "job-orders", "billing", "reports"],
  retail: ["users", "inventory", "pos", "promotions", "reports"],
};

const EMPTY_SELECT_VALUE = "none";

const MODULE_DEPENDENCIES: Partial<Record<ModuleSlug, ModuleSlug[]>> = {
  pos: ["inventory"],
  promotions: ["inventory"],
  appointments: ["services", "hr"],
  "job-orders": ["services"],
  assets: ["crm"],
  billing: ["crm"],
  loyalty: ["crm"],
};

function applyModuleDependencies(moduleSlugs: ModuleSlug[]) {
  const moduleSet = new Set<ModuleSlug>(moduleSlugs);
  moduleSet.add("users");

  for (const moduleSlug of Array.from(moduleSet)) {
    for (const dependency of MODULE_DEPENDENCIES[moduleSlug] ?? []) {
      moduleSet.add(dependency);
    }
  }

  return Array.from(moduleSet);
}

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
      moduleSlugs: PRESET_MODULES["service-shop"],
    },
  });

  const preset = watch("preset");
  const country = watch("country");
  const plan = watch("plan");
  const industry = watch("industry");
  const companySize = watch("companySize");
  const tagPreview = (watch("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const moduleSlugs = (watch("moduleSlugs") ?? ["users"]) as ModuleSlug[];
  const selectedModuleSet = new Set(moduleSlugs);
  const selectedModules = MODULE_OPTIONS.filter((module) => selectedModuleSet.has(module.slug));
  const selectedCountry = TENANT_COUNTRY_OPTIONS.find((option) => option.value === country);
  const selectedPlan = TENANT_PLAN_OPTIONS.find((option) => option.value === plan);
  const selectedIndustry = TENANT_INDUSTRY_OPTIONS.find((option) => option.value === industry);
  const selectedCompanySize = TENANT_COMPANY_SIZE_OPTIONS.find((option) => option.value === companySize);
  const stepDescription =
    step === 1
      ? "Business profile and classification."
      : step === 2
        ? "Plan, preset, and module access."
        : "Owner account and final review.";

  function handlePresetChange(nextPreset: Preset) {
    setValue("preset", nextPreset);
    setValue("moduleSlugs", PRESET_MODULES[nextPreset]);
  }

  function getSelectedDependents(moduleSlug: ModuleSlug) {
    return MODULE_OPTIONS.filter((module) =>
      selectedModuleSet.has(module.slug) && (MODULE_DEPENDENCIES[module.slug] ?? []).includes(moduleSlug)
    );
  }

  function handleModuleToggle(moduleSlug: ModuleSlug, checked: boolean) {
    const option = MODULE_OPTIONS.find((module) => module.slug === moduleSlug);
    if (option?.core && !checked) return;

    const nextModules = checked
      ? Array.from(new Set([...moduleSlugs, moduleSlug]))
      : moduleSlugs.filter((selectedSlug) => selectedSlug !== moduleSlug);

    setValue("moduleSlugs", applyModuleDependencies(nextModules), { shouldValidate: true });
  }

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
    const website = data.website?.trim();
    const normalizedWebsite = website && !/^https?:\/\//i.test(website) ? `https://${website}` : website;
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        website: normalizedWebsite,
        tags: tagPreview,
      }),
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
    const fieldsToValidate =
      step === 1
        ? ([
            "name",
            "slug",
            "country",
            "address",
            "phone",
            "email",
            "website",
            "industry",
            "companySize",
            "tags",
          ] as const)
        : (["preset", "plan", "moduleSlugs"] as const);
    const isValid = await trigger(fieldsToValidate);
    if (!isValid) {
      toast.error(step === 1 ? "Please complete the business profile before continuing" : "Please complete the module setup before continuing");
      return;
    }
    setStep(step === 1 ? 2 : 3);
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
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl lg:max-w-6xl"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="admin-eyebrow">Tenants / New</p>
              <DialogTitle className="mt-1 text-xl font-semibold tracking-tight">
                New Tenant
              </DialogTitle>
              <DialogDescription className="mt-1">
                Step {step} of 3 — {stepDescription}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-1 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 1 ? (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name</Label>
                    <Input
                      id="name"
                      {...register("name", { onChange: handleNameChange })}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input id="slug" {...register("slug")} />
                    {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                    <p className="text-xs text-muted-foreground">
                      Used in the URL: app.bizconnect.app/<strong>{watch("slug") || "slug"}</strong>
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select value={country} onValueChange={(value) => value && setValue("country", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country">
                            {selectedCountry?.label ?? "Select a country"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TENANT_COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address">Business Address</Label>
                      <Input
                        id="address"
                        {...register("address")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Business Phone</Label>
                      <Input id="phone" {...register("phone")} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Business Email</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" {...register("website")} />
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
                            {TENANT_INDUSTRY_OPTIONS.find((option) => option.value === industry)?.label ?? "Select industry"}
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
                            {TENANT_COMPANY_SIZE_OPTIONS.find((option) => option.value === companySize)?.label ?? "Select size"}
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
                      <Label htmlFor="tags">Tags</Label>
                      <Input id="tags" placeholder="pilot, vip, franchise" {...register("tags")} />
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

                <div className="space-y-5 rounded-[24px] border border-border/70 p-5">
                  <p className="text-sm font-semibold text-foreground">Profile summary</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Business: <span className="font-medium text-foreground">{watch("name") || "Your business"}</span></li>
                    <li>URL slug: <span className="font-mono text-foreground">{watch("slug") || "slug"}</span></li>
                    <li>Country: <span className="font-medium text-foreground">{selectedCountry?.label ?? "Netherlands"}</span></li>
                    <li>Industry: <span className="font-medium text-foreground">{selectedIndustry?.label ?? "Not set"}</span></li>
                    <li>Size: <span className="font-medium text-foreground">{selectedCompanySize?.label ?? "Not set"}</span></li>
                    <li>Contact: <span className="font-medium text-foreground">{watch("email") || watch("phone") || "Not set"}</span></li>
                  </ul>
                  {tagPreview.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tagPreview.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : step === 2 ? (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select
                      value={plan}
                      onValueChange={(value) => value && setValue("plan", value as CreateTenantForm["plan"])}
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
                    <Label>Vertical Preset</Label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handlePresetChange("service-shop")}
                        className={`rounded-[24px] border p-4 text-left transition-colors ${
                          preset === "service-shop"
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_40px_-30px_hsl(var(--primary)/0.65)]"
                            : "border-border/70 bg-background text-foreground hover:border-primary/35"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-2xl p-2 ${preset === "service-shop" ? "bg-white/12 text-white" : "bg-primary/10 text-primary"}`}>
                            <BriefcaseBusiness className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Service Shop</p>
                            <p className={`text-xs ${preset === "service-shop" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              CRM, services, job orders, billing, and reports.
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePresetChange("retail")}
                        className={`rounded-[24px] border p-4 text-left transition-colors ${
                          preset === "retail"
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_40px_-30px_hsl(var(--primary)/0.65)]"
                            : "border-border/70 bg-background text-foreground hover:border-primary/35"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-2xl p-2 ${preset === "retail" ? "bg-white/12 text-white" : "bg-primary/10 text-primary"}`}>
                            <ShoppingBag className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Retail</p>
                            <p className={`text-xs ${preset === "retail" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              Inventory, POS, promotions, and reports, with optional billing.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border/70 bg-muted/35 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl bg-primary p-2 text-primary-foreground">
                        {preset === "service-shop" ? (
                          <BriefcaseBusiness className="h-4 w-4" />
                        ) : (
                          <ShoppingBag className="h-4 w-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Customize modules</p>
                        <p className="text-xs text-muted-foreground">
                          Presets select recommended modules. Adjust the final module list before creating the tenant.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {MODULE_OPTIONS.map((module) => {
                        const isSelected = selectedModuleSet.has(module.slug);
                        const selectedDependents = getSelectedDependents(module.slug);
                        const isLocked = Boolean(module.core || selectedDependents.length > 0);

                        return (
                          <div
                            key={module.slug}
                            className={`rounded-2xl border bg-background p-3 transition-colors ${
                              isSelected ? "border-primary/45" : "border-border/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-foreground">{module.name}</p>
                                  {module.core && (
                                    <Badge variant="outline" className="gap-1">
                                      <Lock className="h-2.5 w-2.5" />
                                      Core
                                    </Badge>
                                  )}
                                  {PRESET_MODULES[preset].includes(module.slug) && (
                                    <Badge variant="secondary">Preset</Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
                                {selectedDependents.length > 0 && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Required by {selectedDependents.map((dependent) => dependent.name).join(", ")}.
                                  </p>
                                )}
                                {(MODULE_DEPENDENCIES[module.slug]?.length ?? 0) > 0 && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Adds {MODULE_DEPENDENCIES[module.slug]
                                      ?.map((dependency) => MODULE_OPTIONS.find((option) => option.slug === dependency)?.name)
                                      .filter(Boolean)
                                      .join(", ")}.
                                  </p>
                                )}
                              </div>
                              <Switch
                                checked={isSelected}
                                disabled={isLocked && isSelected}
                                onCheckedChange={(checked) => handleModuleToggle(module.slug, checked)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {errors.moduleSlugs && (
                      <p className="mt-3 text-sm text-destructive">{errors.moduleSlugs.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-5 rounded-[24px] border border-border/70 p-5">
                  <p className="text-sm font-semibold text-foreground">Module summary</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Preset: <span className="font-medium text-foreground">{preset === "service-shop" ? "Service Shop" : "Retail"}</span></li>
                    <li>Plan: <span className="font-medium text-foreground">{selectedPlan?.label ?? "Starter"}</span></li>
                    <li>Modules: <span className="font-medium text-foreground">{selectedModules.length}</span></li>
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {selectedModules.map((module) => (
                      <Badge key={module.slug} variant="secondary">
                        {module.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-5 rounded-[24px] border border-border/70 p-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Initial tenant owner</p>
                    <p className="text-xs text-muted-foreground">
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

                <div className="space-y-5 rounded-[24px] border border-border/70 bg-muted/35 p-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Review setup</p>
                    <p className="text-xs text-muted-foreground">
                      Double-check the business setup before creating the tenant.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Business</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{watch("name") || "Your business"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">app.bizconnect.app/{watch("slug") || "slug"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{watch("email") || watch("phone") || "No contact details yet"}</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profile</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {TENANT_INDUSTRY_OPTIONS.find((option) => option.value === industry)?.label ?? "Industry not set"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {TENANT_COMPANY_SIZE_OPTIONS.find((option) => option.value === companySize)?.label ?? "Size not set"} · {selectedPlan?.label ?? "Starter"} plan
                      </p>
                    </div>
                  </div>

                  {tagPreview.length > 0 && (
                    <div className="rounded-2xl border border-border/70 bg-background p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tagPreview.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-border/70 bg-background p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Modules & options</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedModules.map((module) => (
                        <Badge key={module.slug} variant="secondary">
                          {module.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {selectedModules.length} module{selectedModules.length === 1 ? "" : "s"} selected from the{" "}
                      {preset === "service-shop" ? "Service Shop" : "Retail"} preset.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Owner account</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{watch("adminName") || "Owner name"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{watch("adminEmail") || "owner@example.com"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-4"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full px-4"
                  onClick={handleNextStep}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-4"
                  onClick={() => setStep(step === 2 ? 1 : 2)}
                >
                  Back
                </Button>
                {step === 2 ? (
                  <Button
                    type="button"
                    className="rounded-full px-4"
                    onClick={handleNextStep}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="rounded-full px-4"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Tenant"}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
