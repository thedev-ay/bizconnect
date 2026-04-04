import { prisma } from "../src";

const RETAIL_MODULE_SLUGS = ["users", "inventory", "pos", "promotions", "reports"] as const;
const STARTER_CATEGORIES = [
  { name: "Beverages" },
  { name: "Snacks" },
  { name: "Everyday Essentials" },
] as const;
const STARTER_ITEMS = [
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
const STARTER_PROMO_NAME = "Opening Week 10% Off Snacks";

async function main() {
  const modules = await prisma.module.findMany({
    where: { slug: { in: [...RETAIL_MODULE_SLUGS] } },
    select: { id: true, slug: true },
  });

  if (modules.length !== RETAIL_MODULE_SLUGS.length) {
    throw new Error("One or more retail preset modules are missing from the modules table.");
  }

  const moduleMap = new Map(modules.map((module) => [module.slug, module.id]));

  const candidateTenants = await prisma.tenant.findMany({
    where: {
      tenantModules: {
        some: {
          isEnabled: true,
          module: { slug: "pos" },
        },
      },
    },
    select: {
      id: true,
      slug: true,
      tenantModules: {
        where: { isEnabled: true },
        select: { module: { select: { slug: true } } },
      },
    },
  });

  let updatedCount = 0;
  let seededCatalogCount = 0;
  let seededPromoCount = 0;

  for (const tenant of candidateTenants) {
    const enabledSlugs = new Set(tenant.tenantModules.map((tm) => tm.module.slug));
    const looksLikeRetail =
      enabledSlugs.has("inventory") &&
      enabledSlugs.has("pos") &&
      enabledSlugs.has("reports");

    if (!looksLikeRetail) continue;

    for (const slug of RETAIL_MODULE_SLUGS) {
      const moduleId = moduleMap.get(slug);
      if (!moduleId) continue;

      await prisma.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: tenant.id,
            moduleId,
          },
        },
        update: {
          isEnabled: true,
          disabledAt: null,
          enabledAt: new Date(),
        },
        create: {
          tenantId: tenant.id,
          moduleId,
          isEnabled: true,
        },
      });
    }

    updatedCount += 1;

    const [inventoryItemCount, existingPromotions] = await Promise.all([
      prisma.inventoryItem.count({ where: { tenantId: tenant.id } }),
      prisma.promotion.findMany({
        where: { tenantId: tenant.id },
        select: { name: true },
      }),
    ]);

    if (inventoryItemCount === 0) {
      const categories = await Promise.all(
        STARTER_CATEGORIES.map((category) =>
          prisma.inventoryCategory.create({
            data: {
              tenantId: tenant.id,
              name: category.name,
            },
          })
        )
      );

      const categoryMap = new Map(categories.map((category) => [category.name, category.id]));

      await Promise.all(
        STARTER_ITEMS.map((item) =>
          prisma.inventoryItem.create({
            data: {
              tenantId: tenant.id,
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

      seededCatalogCount += 1;
    }

    const hasStarterPromo = existingPromotions.some((promotion) => promotion.name === STARTER_PROMO_NAME);
    if (!hasStarterPromo) {
      const snackItems = await prisma.inventoryItem.findMany({
        where: {
          tenantId: tenant.id,
          sku: { in: ["RTL-SNACK-001", "RTL-SNACK-002"] },
        },
        select: { id: true },
      });

      if (snackItems.length > 0) {
        await prisma.promotion.create({
          data: {
            tenantId: tenant.id,
            name: STARTER_PROMO_NAME,
            description: "Starter promo for impulse purchases",
            type: "percent_off",
            value: 10,
            items: {
              create: snackItems.map((item) => ({
                itemId: item.id,
              })),
            },
          },
        });

        seededPromoCount += 1;
      }
    }

    console.log(
      `Updated ${tenant.slug}: ensured retail preset modules${inventoryItemCount === 0 ? ", seeded starter catalog" : ""}${!hasStarterPromo ? ", checked starter promo" : ""}.`
    );
  }

  console.log(`Retail backfill complete. Updated ${updatedCount} retail tenant(s).`);
  if (seededCatalogCount > 0) {
    console.log(`Seeded starter catalog for ${seededCatalogCount} tenant(s).`);
  }
  if (seededPromoCount > 0) {
    console.log(`Seeded starter promotions for ${seededPromoCount} tenant(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
