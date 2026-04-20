import { NextResponse } from "next/server";
import { getCurrencyConfig, prisma } from "@bizconnect/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  country: z.string().default("nl"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  preset: z.enum(["service-shop", "retail"]).default("service-shop"),
  plan: z.enum(["starter", "growth", "enterprise"]).default("starter"),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  includeInventory: z.boolean().default(false),
  includeBilling: z.boolean().default(false),
  includeLoyalty: z.boolean().default(false),
  moduleSlugs: z.array(z.string()).optional(),
});

const SERVICE_SHOP_MODULES = ["users", "crm", "assets", "services", "job-orders", "billing", "reports"] as const;
const RETAIL_MODULES = ["users", "inventory", "pos", "promotions", "reports"] as const;
const MODULE_DEPENDENCIES: Record<string, readonly string[]> = {
  pos: ["inventory"],
  promotions: ["inventory"],
  appointments: ["services", "hr"],
  "job-orders": ["services"],
  assets: ["crm"],
  billing: ["crm"],
  loyalty: ["crm"],
};
const CORE_MODULES = ["users"] as const;
const ALL_MODULE_SLUGS = [
  "users",
  "inventory",
  "pos",
  "promotions",
  "appointments",
  "billing",
  "hr",
  "reports",
  "job-orders",
  "crm",
  "assets",
  "services",
  "loyalty",
] as const;
const SERVICE_SHOP_WORKFLOW = [
  { name: "Received", slug: "received", color: "blue", sortOrder: 0, type: "active" as const },
  { name: "Diagnosing", slug: "diagnosing", color: "amber", sortOrder: 1, type: "active" as const },
  { name: "In Progress", slug: "in-progress", color: "violet", sortOrder: 2, type: "active" as const },
  { name: "Ready for Pickup", slug: "ready-for-pickup", color: "emerald", sortOrder: 3, type: "active" as const },
  { name: "Completed", slug: "completed", color: "zinc", sortOrder: 4, type: "completed" as const },
  { name: "Cancelled", slug: "cancelled", color: "red", sortOrder: 5, type: "cancelled" as const },
];
const SERVICE_SHOP_STARTER_SERVICES = [
  {
    name: "Diagnostic Fee",
    description: "Initial assessment and troubleshooting",
    duration: 60,
    pricingType: "flat",
    price: 35,
    category: "Inspection",
    availableForAppointments: false,
    availableForJobOrders: true,
  },
  {
    name: "Repair Labor",
    description: "Standard bench labor",
    duration: 60,
    pricingType: "per_piece",
    price: 75,
    category: "Labor",
    availableForAppointments: false,
    availableForJobOrders: true,
  },
  {
    name: "Installation Labor",
    description: "Install and setup service",
    duration: 60,
    pricingType: "per_piece",
    price: 95,
    category: "Labor",
    availableForAppointments: false,
    availableForJobOrders: true,
  },
  {
    name: "Cleaning Service",
    description: "General cleaning and tune-up",
    duration: 60,
    pricingType: "flat",
    price: 45,
    category: "Maintenance",
    availableForAppointments: false,
    availableForJobOrders: true,
  },
] as const;
const RETAIL_STARTER_CATEGORIES = [
  { name: "Beverages" },
  { name: "Snacks" },
  { name: "Everyday Essentials" },
] as const;
const RETAIL_STARTER_ITEMS = [
  {
    name: "Sparkling Water",
    sku: "RTL-SPARK-001",
    quantity: 48,
    reorderAt: 12,
    unitCost: 0.75,
    unitPrice: 1.8,
    categoryName: "Beverages",
  },
  {
    name: "Cold Brew Coffee",
    sku: "RTL-COFFEE-001",
    quantity: 30,
    reorderAt: 8,
    unitCost: 1.25,
    unitPrice: 3.5,
    categoryName: "Beverages",
  },
  {
    name: "Sea Salt Chips",
    sku: "RTL-SNACK-001",
    quantity: 40,
    reorderAt: 10,
    unitCost: 0.9,
    unitPrice: 2.4,
    categoryName: "Snacks",
  },
  {
    name: "Trail Mix Pack",
    sku: "RTL-SNACK-002",
    quantity: 28,
    reorderAt: 6,
    unitCost: 1.4,
    unitPrice: 3.2,
    categoryName: "Snacks",
  },
  {
    name: "Hand Soap",
    sku: "RTL-ESS-001",
    quantity: 18,
    reorderAt: 5,
    unitCost: 2.15,
    unitPrice: 4.95,
    categoryName: "Everyday Essentials",
  },
] as const;
const RETAIL_STARTER_PROMOTION = {
  name: "Opening Week 10% Off Snacks",
  description: "Starter promo for impulse purchases",
  type: "percent_off",
  value: 10,
} as const;
const RETAIL_LOYALTY_SETTINGS = {
  stampsPerReward: 8,
  rewardDescription: "10% off your next purchase",
  isActive: true,
} as const;

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTags(value?: string[] | string) {
  const rawTags = Array.isArray(value) ? value : value?.split(",") ?? [];
  return Array.from(
    new Set(
      rawTags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, tenantModules: { where: { isEnabled: true } } } },
    },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    name,
    slug,
    country,
    address,
    phone,
    email,
    website,
    industry,
    companySize,
    tags,
    preset,
    plan,
    adminName,
    adminEmail,
    adminPassword,
    includeInventory,
    includeBilling,
    includeLoyalty,
    moduleSlugs: requestedModuleSlugs,
  } = parsed.data;
  const normalizedCountry = country.toLowerCase();
  const normalizedTags = normalizeTags(tags);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    return NextResponse.json({ error: "Admin email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const currencyConfig = getCurrencyConfig(normalizedCountry);
  const fallbackModuleSlugs =
    preset === "retail"
      ? [
          ...RETAIL_MODULES,
          ...(includeBilling ? ["billing"] : []),
          ...(includeLoyalty ? ["loyalty"] : []),
        ]
      : includeInventory
        ? [...SERVICE_SHOP_MODULES, "inventory"]
        : [...SERVICE_SHOP_MODULES];
  const submittedModuleSlugs = requestedModuleSlugs?.length ? requestedModuleSlugs : fallbackModuleSlugs;
  const moduleSlugSet = new Set<string>(submittedModuleSlugs);

  for (const coreModule of CORE_MODULES) {
    moduleSlugSet.add(coreModule);
  }

  for (const moduleSlug of Array.from(moduleSlugSet)) {
    for (const dependency of MODULE_DEPENDENCIES[moduleSlug] ?? []) {
      moduleSlugSet.add(dependency);
    }
  }

  const unknownModules = Array.from(moduleSlugSet).filter(
    (moduleSlug) => !ALL_MODULE_SLUGS.includes(moduleSlug as (typeof ALL_MODULE_SLUGS)[number])
  );
  if (unknownModules.length > 0) {
    return NextResponse.json({ error: `Unknown module(s): ${unknownModules.join(", ")}` }, { status: 400 });
  }

  const moduleSlugs = Array.from(moduleSlugSet);
  const moduleRecords = await prisma.module.findMany({
    where: { slug: { in: moduleSlugs } },
    select: { id: true, slug: true },
  });

  if (moduleRecords.length !== moduleSlugs.length) {
    const foundSlugs = new Set(moduleRecords.map((module) => module.slug));
    const missingSlugs = moduleSlugs.filter((moduleSlug) => !foundSlugs.has(moduleSlug));
    return NextResponse.json(
      { error: `Missing module seed data for: ${missingSlugs.join(", ")}. Run the database seed before creating this tenant.` },
      { status: 400 }
    );
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: {
        name,
        slug,
        country: normalizedCountry,
        address: normalizeOptionalText(address),
        phone: normalizeOptionalText(phone),
        email: normalizeOptionalText(email),
        website: normalizeOptionalText(website),
        industry: normalizeOptionalText(industry),
        companySize: normalizeOptionalText(companySize),
        tags: normalizedTags,
        plan,
        currencySymbol: currencyConfig.symbol,
        currencyLocale: currencyConfig.locale,
      },
    });

    await tx.tenantModule.createMany({
      data: moduleRecords.map((module) => ({
        tenantId: newTenant.id,
        moduleId: module.id,
        isEnabled: true,
      })),
    });

    await tx.user.create({
      data: {
        tenantId: newTenant.id,
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "owner",
      },
    });

    if (moduleSlugs.includes("job-orders")) {
      await tx.workflowStage.createMany({
        data: SERVICE_SHOP_WORKFLOW.map((stage) => ({
          tenantId: newTenant.id,
          ...stage,
        })),
      });
    }

    if (moduleSlugs.includes("services")) {
      await (tx as any).service.createMany({
        data: SERVICE_SHOP_STARTER_SERVICES.map((service) => ({
          tenantId: newTenant.id,
          ...service,
        })),
      });
    }

    if (preset === "retail" && moduleSlugs.includes("inventory")) {
      const categories = await Promise.all(
        RETAIL_STARTER_CATEGORIES.map((category) =>
          tx.inventoryCategory.create({
            data: {
              tenantId: newTenant.id,
              name: category.name,
            },
          })
        )
      );

      const categoryMap = new Map(categories.map((category) => [category.name, category.id]));

      const items = await Promise.all(
        RETAIL_STARTER_ITEMS.map((item) =>
          tx.inventoryItem.create({
            data: {
              tenantId: newTenant.id,
              categoryId: categoryMap.get(item.categoryName) ?? null,
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              reorderAt: item.reorderAt,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
            },
          })
        )
      );

      if (moduleSlugs.includes("promotions")) {
        const promoTargetItems = items.filter((item) =>
          ["Sea Salt Chips", "Trail Mix Pack"].includes(item.name)
        );

        if (promoTargetItems.length > 0) {
          await tx.promotion.create({
            data: {
              tenantId: newTenant.id,
              name: RETAIL_STARTER_PROMOTION.name,
              description: RETAIL_STARTER_PROMOTION.description,
              type: RETAIL_STARTER_PROMOTION.type,
              value: RETAIL_STARTER_PROMOTION.value,
              items: {
                create: promoTargetItems.map((item) => ({
                  itemId: item.id,
                })),
              },
            },
          });
        }
      }
    }

    if (moduleSlugs.includes("loyalty")) {
      await tx.loyaltySetting.create({
        data: {
          tenantId: newTenant.id,
          ...RETAIL_LOYALTY_SETTINGS,
        },
      });
    }

    return newTenant;
  });

  return NextResponse.json(tenant, { status: 201 });
}
