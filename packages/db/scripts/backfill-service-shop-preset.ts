import { prisma } from "../src";

const SERVICE_SHOP_MODULES = ["users", "crm", "assets", "services", "job-orders", "billing", "reports"] as const;
const STARTER_SERVICES = [
  {
    name: "Diagnostic Fee",
    description: "Initial assessment and troubleshooting",
    pricingType: "flat",
    price: 35,
    category: "Inspection",
  },
  {
    name: "Repair Labor",
    description: "Standard bench labor",
    pricingType: "per_piece",
    price: 75,
    category: "Labor",
  },
  {
    name: "Installation Labor",
    description: "Install and setup service",
    pricingType: "per_piece",
    price: 95,
    category: "Labor",
  },
  {
    name: "Cleaning Service",
    description: "General cleaning and tune-up",
    pricingType: "flat",
    price: 45,
    category: "Maintenance",
  },
] as const;

async function main() {
  const servicesModule = await prisma.module.findUnique({
    where: { slug: "services" },
    select: { id: true },
  });

  if (!servicesModule) {
    throw new Error('Required module "services" was not found.');
  }

  const candidateTenants = await prisma.tenant.findMany({
    where: {
      tenantModules: {
        some: {
          isEnabled: true,
          module: { slug: "job-orders" },
        },
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      tenantModules: {
        where: { isEnabled: true },
        select: {
          module: {
            select: {
              slug: true,
            },
          },
        },
      },
      serviceCatalog: {
        select: {
          name: true,
        },
      },
    },
  });

  let updatedCount = 0;
  let seededCount = 0;

  for (const tenant of candidateTenants) {
    const enabledSlugs = new Set(tenant.tenantModules.map((tm) => tm.module.slug));
    const looksLikeServiceShop =
      enabledSlugs.has("crm") &&
      enabledSlugs.has("assets") &&
      enabledSlugs.has("job-orders") &&
      enabledSlugs.has("billing") &&
      enabledSlugs.has("reports");

    if (!looksLikeServiceShop) continue;

    await prisma.tenantModule.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: servicesModule.id,
        },
      },
      update: {
        isEnabled: true,
        disabledAt: null,
        enabledAt: new Date(),
      },
      create: {
        tenantId: tenant.id,
        moduleId: servicesModule.id,
        isEnabled: true,
      },
    });

    updatedCount += 1;

    const existingNames = new Set(tenant.serviceCatalog.map((service) => service.name));
    const missingStarterServices = STARTER_SERVICES.filter((service) => !existingNames.has(service.name));
    if (missingStarterServices.length > 0) {
      await prisma.serviceCatalog.createMany({
        data: missingStarterServices.map((service) => ({
          tenantId: tenant.id,
          ...service,
        })),
      });
      seededCount += 1;
    }

    console.log(
      `Updated ${tenant.slug}: enabled services module${missingStarterServices.length > 0 ? " and seeded missing starter services" : ""}.`
    );
  }

  console.log(`Backfill complete. Updated ${updatedCount} service-shop tenant(s).`);
  if (seededCount > 0) {
    console.log(`Seeded missing starter service templates for ${seededCount} tenant(s).`);
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
