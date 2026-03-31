import { PrismaClient } from "../src/generated";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MODULES = [
  {
    slug: "users",
    name: "User Management",
    description: "Manage users, roles, and permissions",
    icon: "Users",
    isCore: true,
    sortOrder: 0,
  },
  {
    slug: "inventory",
    name: "Inventory",
    description: "Track stock, products, categories, and suppliers",
    icon: "Package",
    isCore: false,
    sortOrder: 1,
  },
  {
    slug: "pos",
    name: "Point of Sale",
    description: "Walk-in sales, cart, payments, and receipts",
    icon: "ShoppingCart",
    isCore: false,
    sortOrder: 2,
  },
  {
    slug: "appointments",
    name: "Appointments",
    description: "Calendar, bookings, reminders, and availability",
    icon: "Calendar",
    isCore: false,
    sortOrder: 3,
  },
  {
    slug: "billing",
    name: "Billing & Invoicing",
    description: "Invoices, payments, and outstanding balances",
    icon: "CreditCard",
    isCore: false,
    sortOrder: 4,
  },
  {
    slug: "hr",
    name: "HR & Payroll",
    description: "Staff scheduling, attendance, and payroll computation",
    icon: "Briefcase",
    isCore: false,
    sortOrder: 5,
  },
  {
    slug: "reports",
    name: "Reports & Analytics",
    description: "Revenue, inventory, and performance reports",
    icon: "BarChart2",
    isCore: false,
    sortOrder: 6,
  },
  {
    slug: "job-orders",
    name: "Job Orders",
    description: "Track service jobs, assignments, and status",
    icon: "ClipboardList",
    isCore: false,
    sortOrder: 7,
  },
  {
    slug: "crm",
    name: "CRM",
    description: "Customer records, history, and communications",
    icon: "UserCheck",
    isCore: false,
    sortOrder: 8,
  },
  {
    slug: "staff",
    name: "Staff Scheduling",
    description: "Shift planning, weekly roster, and staff availability",
    icon: "CalendarCheck",
    isCore: false,
    sortOrder: 9,
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert all modules
  for (const mod of MODULES) {
    await prisma.module.upsert({
      where: { slug: mod.slug },
      update: mod,
      create: mod,
    });
  }
  console.log(`✅ Seeded ${MODULES.length} modules`);

  // Create super admin user
  const superAdminPasswordHash = await bcrypt.hash("SuperAdmin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@bizconnect.app" },
    update: {},
    create: {
      email: "admin@bizconnect.app",
      name: "Super Admin",
      passwordHash: superAdminPasswordHash,
      isSuperAdmin: true,
      role: "owner",
    },
  });
  console.log("✅ Created super admin: admin@bizconnect.app / SuperAdmin123!");

  // Create a demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Demo Business",
      plan: "growth",
      isActive: true,
    },
  });
  console.log(`✅ Created demo tenant: ${demoTenant.slug}`);

  // Activate core modules + inventory + pos for demo tenant
  const modulesToActivate = ["users", "inventory", "pos", "reports"];
  for (const moduleSlug of modulesToActivate) {
    const module = await prisma.module.findUnique({ where: { slug: moduleSlug } });
    if (!module) continue;
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: demoTenant.id, moduleId: module.id } },
      update: { isEnabled: true },
      create: { tenantId: demoTenant.id, moduleId: module.id, isEnabled: true },
    });
  }
  console.log(`✅ Activated modules for demo tenant: ${modulesToActivate.join(", ")}`);

  // Create demo tenant admin user
  const demoAdminPasswordHash = await bcrypt.hash("DemoAdmin123!", 12);
  await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: {
      email: "owner@demo.com",
      name: "Demo Owner",
      passwordHash: demoAdminPasswordHash,
      role: "owner",
      tenantId: demoTenant.id,
    },
  });
  console.log("✅ Created demo tenant user: owner@demo.com / DemoAdmin123!");

  console.log("\n✨ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
