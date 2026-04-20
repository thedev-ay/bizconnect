import { PrismaClient } from "../src/generated";
import { faker } from "@faker-js/faker";
import { getCountryConfig, getCurrencyConfig, getFakerLocale } from "../src/locale";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MODULES = [
  { slug: "users", name: "User Management", description: "Manage users, roles, and permissions", icon: "Users", isCore: true, sortOrder: 0 },
  { slug: "inventory", name: "Inventory", description: "Track stock, products, categories, and suppliers", icon: "Package", isCore: false, sortOrder: 1 },
  { slug: "pos", name: "Point of Sale", description: "Walk-in sales, cart, payments, and receipts", icon: "ShoppingCart", isCore: false, sortOrder: 2 },
  { slug: "appointments", name: "Appointments", description: "Calendar, bookings, reminders, and availability", icon: "Calendar", isCore: false, sortOrder: 3 },
  { slug: "billing", name: "Billing & Invoicing", description: "Invoices, payments, and outstanding balances", icon: "CreditCard", isCore: false, sortOrder: 4 },
  { slug: "services", name: "Services", description: "Service catalog, prices, and appointment/job availability", icon: "Wrench", isCore: false, sortOrder: 5 },
  { slug: "hr", name: "HR & Staff", description: "Employees, scheduling, attendance, leave, and payroll", icon: "Briefcase", isCore: false, sortOrder: 6 },
  { slug: "reports", name: "Reports & Analytics", description: "Revenue, inventory, and performance reports", icon: "BarChart2", isCore: false, sortOrder: 7 },
  { slug: "job-orders", name: "Job Orders", description: "Track service jobs, assignments, and status", icon: "ClipboardList", isCore: false, sortOrder: 8 },
  { slug: "crm", name: "CRM", description: "Customer records, history, and communications", icon: "UserCheck", isCore: false, sortOrder: 9 },
  { slug: "assets", name: "Assets", description: "Track customer-linked serviceable assets and history", icon: "CarFront", isCore: false, sortOrder: 10 },
  { slug: "loyalty", name: "Loyalty", description: "Stamp cards, rewards, and loyalty redemptions", icon: "BadgePercent", isCore: false, sortOrder: 11 },
];

async function main() {
  console.log("🌱 Seeding database...");

  // ── Modules ────────────────────────────────────────────────────────────────
  // Remove deprecated modules that have been merged into others
  await prisma.module.deleteMany({ where: { slug: { in: ["staff"] } } });

  for (const mod of MODULES) {
    await prisma.module.upsert({ where: { slug: mod.slug }, update: mod, create: mod });
  }
  console.log(`✅ Seeded ${MODULES.length} modules`);

  // ── Super admin ────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash("SuperAdmin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@bizconnect.app" },
    update: {},
    create: { email: "admin@bizconnect.app", name: "Super Admin", passwordHash: superAdminHash, isSuperAdmin: true, role: "owner" },
  });
  console.log("✅ Super admin: admin@bizconnect.app / SuperAdmin123!");

  // ── Demo tenant ────────────────────────────────────────────────────────────
  const demoCountry = "nl";
  faker.locale = getFakerLocale(demoCountry);
  const currencyConfig = getCurrencyConfig(demoCountry);
  
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Glow & Co. Salon",
      country: demoCountry,
      plan: "growth",
      isActive: true,
      address: faker.location.streetAddress(),
      phone: faker.phone.number(),
      email: "hello@glowandco.nl",
      currencySymbol: currencyConfig.symbol,
      currencyLocale: currencyConfig.locale,
      defaultTaxRate: "12.00",
    },
  });
  console.log(`✅ Demo tenant: ${tenant.slug} (${tenant.name})`);

  // ── Business hours ──────────────────────────────────────────────────────────
  const defaultHours = [
    { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" }, // Sun
    { dayOfWeek: 1, isOpen: true,  openTime: "09:00", closeTime: "19:00" }, // Mon
    { dayOfWeek: 2, isOpen: true,  openTime: "09:00", closeTime: "19:00" }, // Tue
    { dayOfWeek: 3, isOpen: true,  openTime: "09:00", closeTime: "19:00" }, // Wed
    { dayOfWeek: 4, isOpen: true,  openTime: "09:00", closeTime: "19:00" }, // Thu
    { dayOfWeek: 5, isOpen: true,  openTime: "09:00", closeTime: "20:00" }, // Fri
    { dayOfWeek: 6, isOpen: true,  openTime: "10:00", closeTime: "20:00" }, // Sat
  ];
  for (const h of defaultHours) {
    await prisma.businessHours.upsert({
      where: { tenantId_dayOfWeek: { tenantId: tenant.id, dayOfWeek: h.dayOfWeek } },
      update: h,
      create: { tenantId: tenant.id, ...h },
    });
  }
  console.log("✅ Seeded default business hours");

  // Enable all modules for demo tenant
  const allModules = await prisma.module.findMany();
  for (const mod of allModules) {
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: mod.id } },
      update: { isEnabled: true },
      create: { tenantId: tenant.id, moduleId: mod.id, isEnabled: true },
    });
  }
  console.log("✅ Enabled all modules for demo tenant");

  // ── Tenant users ───────────────────────────────────────────────────────────
  const ownerHash = await bcrypt.hash("DemoAdmin123!", 12);
  const memberHash = await bcrypt.hash("Member123!", 12);

  await prisma.user.upsert({
    where: { email: "owner@demo.com" },
    update: {},
    create: { email: "owner@demo.com", name: "Maria Santos", passwordHash: ownerHash, role: "owner", tenantId: tenant.id },
  });
  await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { email: "admin@demo.com", name: "Jake Rivera", passwordHash: memberHash, role: "admin", tenantId: tenant.id },
  });
  await prisma.user.upsert({
    where: { email: "staff@demo.com" },
    update: {},
    create: { email: "staff@demo.com", name: "Anna Cruz", passwordHash: memberHash, role: "member", tenantId: tenant.id },
  });
  console.log("✅ Tenant users: owner@demo.com / DemoAdmin123!, admin@demo.com / Member123!, staff@demo.com / Member123!");

  // ── Inventory ──────────────────────────────────────────────────────────────
  const catHair = await prisma.inventoryCategory.upsert({
    where: { id: "cat-hair-demo" },
    update: {},
    create: { id: "cat-hair-demo", tenantId: tenant.id, name: "Hair Care" },
  });
  const catSkin = await prisma.inventoryCategory.upsert({
    where: { id: "cat-skin-demo" },
    update: {},
    create: { id: "cat-skin-demo", tenantId: tenant.id, name: "Skin Care" },
  });
  const catTools = await prisma.inventoryCategory.upsert({
    where: { id: "cat-tools-demo" },
    update: {},
    create: { id: "cat-tools-demo", tenantId: tenant.id, name: "Tools & Equipment" },
  });

  const inventoryItems = [
    { id: "inv-001", tenantId: tenant.id, categoryId: catHair.id, name: "Keratin Treatment Serum", sku: "KER-001", quantity: 24, reorderAt: 5, unitCost: "350.00", unitPrice: "680.00" },
    { id: "inv-002", tenantId: tenant.id, categoryId: catHair.id, name: "Color Developer 20Vol", sku: "DEV-020", quantity: 48, reorderAt: 10, unitCost: "120.00", unitPrice: "220.00" },
    { id: "inv-003", tenantId: tenant.id, categoryId: catHair.id, name: "Bleaching Powder", sku: "BLE-001", quantity: 15, reorderAt: 5, unitCost: "180.00", unitPrice: "350.00" },
    { id: "inv-004", tenantId: tenant.id, categoryId: catHair.id, name: "Moisturizing Shampoo 500ml", sku: "SMP-001", quantity: 30, reorderAt: 8, unitCost: "95.00", unitPrice: "180.00" },
    { id: "inv-005", tenantId: tenant.id, categoryId: catSkin.id, name: "Facial Cleanser 200ml", sku: "FCL-001", quantity: 20, reorderAt: 5, unitCost: "140.00", unitPrice: "280.00" },
    { id: "inv-006", tenantId: tenant.id, categoryId: catSkin.id, name: "Vitamin C Serum 30ml", sku: "VCS-001", quantity: 12, reorderAt: 4, unitCost: "320.00", unitPrice: "650.00" },
    { id: "inv-007", tenantId: tenant.id, categoryId: catTools.id, name: "Professional Hair Dryer", sku: "HD-PRO", quantity: 4, reorderAt: 1, unitCost: "2800.00", unitPrice: "4500.00" },
    { id: "inv-008", tenantId: tenant.id, categoryId: catTools.id, name: "Flat Iron Ceramic 1\"", sku: "FI-CER", quantity: 6, reorderAt: 2, unitCost: "1200.00", unitPrice: "2000.00" },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({ where: { id: item.id }, update: {}, create: item as any });
  }
  console.log(`✅ Seeded ${inventoryItems.length} inventory items`);

  // ── Services ───────────────────────────────────────────────────────────────
  const services = [
    { id: "svc-001", tenantId: tenant.id, name: "Haircut & Blowdry", duration: 60, price: "450.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-002", tenantId: tenant.id, name: "Full Color", duration: 120, price: "1800.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-003", tenantId: tenant.id, name: "Highlights", duration: 150, price: "2500.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-004", tenantId: tenant.id, name: "Keratin Treatment", duration: 180, price: "3500.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-005", tenantId: tenant.id, name: "Facial Basic", duration: 60, price: "800.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-006", tenantId: tenant.id, name: "Facial Premium", duration: 90, price: "1500.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-007", tenantId: tenant.id, name: "Manicure", duration: 45, price: "350.00", availableForAppointments: true, availableForJobOrders: false },
    { id: "svc-008", tenantId: tenant.id, name: "Pedicure", duration: 60, price: "450.00", availableForAppointments: true, availableForJobOrders: false },
  ];

  for (const svc of services) {
    await prisma.service.upsert({ where: { id: svc.id }, update: {}, create: svc as any });
  }
  console.log(`✅ Seeded ${services.length} services`);

  // ── Employees ──────────────────────────────────────────────────────────────
  const employees = [
    { id: "emp-001", tenantId: tenant.id, employeeNo: "EMP-001", name: "Sofia Reyes", email: "sofia@demo.com", phone: "09171234567", position: "Senior Stylist", department: "Hair", hireDate: new Date("2021-03-15"), salary: "25000.00", commissionRate: "10.00", accessLevel: "staff" },
    { id: "emp-002", tenantId: tenant.id, employeeNo: "EMP-002", name: "Lena Torres", email: "lena@demo.com", phone: "09182345678", position: "Colorist", department: "Hair", hireDate: new Date("2022-06-01"), salary: "22000.00", commissionRate: "12.00", accessLevel: "staff" },
    { id: "emp-003", tenantId: tenant.id, employeeNo: "EMP-003", name: "Mark Dela Cruz", email: "mark@demo.com", phone: "09193456789", position: "Nail Technician", department: "Nails", hireDate: new Date("2023-01-10"), salary: "18000.00", commissionRate: "8.00", accessLevel: "staff" },
    { id: "emp-004", tenantId: tenant.id, employeeNo: "EMP-004", name: "Ria Gomez", email: "ria@demo.com", phone: "09204567890", position: "Esthetician", department: "Skin", hireDate: new Date("2022-09-20"), salary: "20000.00", commissionRate: "10.00", accessLevel: "staff" },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({ where: { id: emp.id }, update: {}, create: emp as any });
  }
  console.log(`✅ Seeded ${employees.length} employees`);

  // Working hours: Mon–Sat 9am–6pm for all employees
  const workDays = [1, 2, 3, 4, 5, 6]; // Mon–Sat
  for (const emp of employees) {
    for (const day of workDays) {
      await prisma.workingHours.upsert({
        where: { employeeId_dayOfWeek: { employeeId: emp.id, dayOfWeek: day } },
        update: {},
        create: { employeeId: emp.id, dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
      });
    }
  }

  // Assign services to staff
  const staffServices = [
    // Sofia: haircut, color, highlights, keratin
    { employeeId: "emp-001", serviceId: "svc-001" },
    { employeeId: "emp-001", serviceId: "svc-002" },
    { employeeId: "emp-001", serviceId: "svc-003" },
    { employeeId: "emp-001", serviceId: "svc-004" },
    // Lena: color, highlights, keratin
    { employeeId: "emp-002", serviceId: "svc-002" },
    { employeeId: "emp-002", serviceId: "svc-003" },
    { employeeId: "emp-002", serviceId: "svc-004" },
    // Mark: manicure, pedicure
    { employeeId: "emp-003", serviceId: "svc-007" },
    { employeeId: "emp-003", serviceId: "svc-008" },
    // Ria: facial basic, facial premium
    { employeeId: "emp-004", serviceId: "svc-005" },
    { employeeId: "emp-004", serviceId: "svc-006" },
  ];
  for (const ss of staffServices) {
    await prisma.staffService.upsert({
      where: { employeeId_serviceId: { employeeId: ss.employeeId, serviceId: ss.serviceId } },
      update: {},
      create: ss,
    });
  }
  console.log("✅ Assigned services to staff + working hours");

  // ── Shifts (current week) ──────────────────────────────────────────────────
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // this Monday
  monday.setHours(0, 0, 0, 0);

  const shifts = [
    { id: "shf-001", tenantId: tenant.id, employeeId: "emp-001", title: "Morning Shift", startAt: shiftDate(monday, 0, 9, 0), endAt: shiftDate(monday, 0, 15, 0) },
    { id: "shf-002", tenantId: tenant.id, employeeId: "emp-002", title: "Afternoon Shift", startAt: shiftDate(monday, 0, 13, 0), endAt: shiftDate(monday, 0, 19, 0) },
    { id: "shf-003", tenantId: tenant.id, employeeId: "emp-001", title: "Morning Shift", startAt: shiftDate(monday, 2, 9, 0), endAt: shiftDate(monday, 2, 15, 0) },
    { id: "shf-004", tenantId: tenant.id, employeeId: "emp-003", title: "Full Day", startAt: shiftDate(monday, 1, 9, 0), endAt: shiftDate(monday, 1, 18, 0) },
    { id: "shf-005", tenantId: tenant.id, employeeId: "emp-004", title: "Full Day", startAt: shiftDate(monday, 3, 9, 0), endAt: shiftDate(monday, 3, 18, 0) },
    { id: "shf-006", tenantId: tenant.id, employeeId: "emp-002", title: "Morning Shift", startAt: shiftDate(monday, 4, 9, 0), endAt: shiftDate(monday, 4, 14, 0) },
  ];
  for (const shift of shifts) {
    await prisma.shift.upsert({ where: { id: shift.id }, update: {}, create: shift });
  }
  console.log(`✅ Seeded ${shifts.length} shifts`);

  // ── Appointments ───────────────────────────────────────────────────────────
  const appointments = [
    { id: "apt-001", tenantId: tenant.id, title: "Haircut & Blowdry – Claire", customerName: "Claire Mendoza", customerPhone: "09171112222", employeeId: "emp-001", serviceId: "svc-001", startAt: shiftDate(monday, 0, 10, 0), endAt: shiftDate(monday, 0, 11, 0), status: "done" },
    { id: "apt-002", tenantId: tenant.id, title: "Full Color – Rachel", customerName: "Rachel Lim", customerPhone: "09182223333", employeeId: "emp-002", serviceId: "svc-002", startAt: shiftDate(monday, 1, 10, 0), endAt: shiftDate(monday, 1, 12, 0), status: "confirmed" },
    { id: "apt-003", tenantId: tenant.id, title: "Facial Basic – Dana", customerName: "Dana Reyes", customerPhone: "09193334444", employeeId: "emp-004", serviceId: "svc-005", startAt: shiftDate(monday, 2, 11, 0), endAt: shiftDate(monday, 2, 12, 0), status: "pending" },
    { id: "apt-004", tenantId: tenant.id, title: "Manicure – Beth", customerName: "Beth Santos", customerPhone: "09204445555", employeeId: "emp-003", serviceId: "svc-007", startAt: shiftDate(monday, 3, 13, 0), endAt: shiftDate(monday, 3, 13, 45), status: "confirmed" },
    { id: "apt-005", tenantId: tenant.id, title: "Highlights – Jess", customerName: "Jessica Chan", customerPhone: "09215556666", employeeId: "emp-001", serviceId: "svc-003", startAt: shiftDate(monday, 4, 9, 0), endAt: shiftDate(monday, 4, 11, 30), status: "pending" },
    { id: "apt-006", tenantId: tenant.id, title: "Keratin – Mia", customerName: "Mia Ocampo", customerPhone: "09226667777", employeeId: "emp-002", serviceId: "svc-004", startAt: shiftDate(monday, 5, 10, 0), endAt: shiftDate(monday, 5, 13, 0), status: "pending" },
  ];
  for (const apt of appointments) {
    await prisma.appointment.upsert({ where: { id: apt.id }, update: {}, create: apt });
  }
  console.log(`✅ Seeded ${appointments.length} appointments`);

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = [
    { id: "cus-001", tenantId: tenant.id, name: "Claire Mendoza", email: "claire@email.com", phone: "09171112222", address: "123 Marigold St, Quezon City", tags: ["regular", "vip"] },
    { id: "cus-002", tenantId: tenant.id, name: "Rachel Lim", email: "rachel@email.com", phone: "09182223333", address: "456 Sampaguita Ave, Pasig", tags: ["regular"] },
    { id: "cus-003", tenantId: tenant.id, name: "Dana Reyes", email: "dana@email.com", phone: "09193334444", tags: ["new"] },
    { id: "cus-004", tenantId: tenant.id, name: "Beth Santos", email: "beth@email.com", phone: "09204445555", address: "789 Orchid Rd, Makati", tags: ["regular"] },
    { id: "cus-005", tenantId: tenant.id, name: "Jessica Chan", email: "jessica@email.com", phone: "09215556666", tags: ["vip"] },
    { id: "cus-006", tenantId: tenant.id, name: "Mia Ocampo", email: "mia@email.com", phone: "09226667777", address: "321 Rose Blvd, Taguig", tags: ["regular"] },
    { id: "cus-007", tenantId: tenant.id, name: "Tricia Villanueva", phone: "09237778888", tags: ["new"] },
    { id: "cus-008", tenantId: tenant.id, name: "Carla Pascual", email: "carla@email.com", phone: "09248889999", tags: ["regular", "vip"] },
  ];
  for (const cus of customers) {
    await prisma.customer.upsert({ where: { id: cus.id }, update: {}, create: cus as any });
  }
  console.log(`✅ Seeded ${customers.length} customers`);

  // ── POS Sales ──────────────────────────────────────────────────────────────
  const sale1 = await prisma.sale.upsert({
    where: { id: "sale-001" },
    update: {},
    create: {
      id: "sale-001", tenantId: tenant.id, referenceNo: "TXN-0001",
      subtotal: "860.00", discount: "0.00", total: "860.00",
      amountPaid: "1000.00", change: "140.00", paymentMethod: "cash", status: "completed",
      createdAt: shiftDate(monday, -7, 10, 30),
    },
  });
  await prisma.saleItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "si-001", saleId: sale1.id, itemId: "inv-004", name: "Moisturizing Shampoo 500ml", quantity: 2, unitPrice: "180.00", total: "360.00" },
      { id: "si-002", saleId: sale1.id, itemId: "inv-005", name: "Facial Cleanser 200ml", quantity: 1, unitPrice: "280.00", total: "280.00" },
      { id: "si-003", saleId: sale1.id, itemId: "inv-007", name: "Professional Hair Dryer", quantity: 0, unitPrice: "4500.00", total: "0.00" },
    ],
  });

  const sale2 = await prisma.sale.upsert({
    where: { id: "sale-002" },
    update: {},
    create: {
      id: "sale-002", tenantId: tenant.id, referenceNo: "TXN-0002",
      subtotal: "650.00", discount: "50.00", total: "600.00",
      amountPaid: "600.00", change: "0.00", paymentMethod: "gcash", status: "completed",
      createdAt: shiftDate(monday, -5, 14, 0),
    },
  });
  await prisma.saleItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "si-004", saleId: sale2.id, itemId: "inv-006", name: "Vitamin C Serum 30ml", quantity: 1, unitPrice: "650.00", total: "650.00" },
    ],
  });

  const sale3 = await prisma.sale.upsert({
    where: { id: "sale-003" },
    update: {},
    create: {
      id: "sale-003", tenantId: tenant.id, referenceNo: "TXN-0003",
      subtotal: "2000.00", discount: "0.00", total: "2000.00",
      amountPaid: "2000.00", change: "0.00", paymentMethod: "card", status: "completed",
      createdAt: shiftDate(monday, -2, 11, 0),
    },
  });
  await prisma.saleItem.createMany({
    skipDuplicates: true,
    data: [
      { id: "si-005", saleId: sale3.id, itemId: "inv-008", name: "Flat Iron Ceramic 1\"", quantity: 1, unitPrice: "2000.00", total: "2000.00" },
    ],
  });
  console.log("✅ Seeded 3 POS sales");

  // ── Invoices ───────────────────────────────────────────────────────────────
  const invoices = [
    {
      id: "inv-bill-001", tenantId: tenant.id, invoiceNo: "INV-2024-001",
      customerName: "Claire Mendoza", customerEmail: "claire@email.com",
      dueDate: shiftDate(monday, 7, 0, 0), subtotal: "4500.00", tax: "540.00", total: "5040.00",
      status: "paid", paidAt: shiftDate(monday, -3, 0, 0),
      items: [
        { id: "ii-001", description: "Keratin Treatment", quantity: 1, unitPrice: "3500.00", total: "3500.00" },
        { id: "ii-002", description: "Haircut & Blowdry", quantity: 1, unitPrice: "450.00", total: "450.00" },
        { id: "ii-003", description: "Moisturizing Shampoo 500ml", quantity: 3, unitPrice: "180.00", total: "540.00" },
      ],
    },
    {
      id: "inv-bill-002", tenantId: tenant.id, invoiceNo: "INV-2024-002",
      customerName: "Jessica Chan", customerEmail: "jessica@email.com",
      dueDate: shiftDate(monday, 14, 0, 0), subtotal: "2500.00", tax: "300.00", total: "2800.00",
      status: "sent",
      items: [
        { id: "ii-004", description: "Highlights", quantity: 1, unitPrice: "2500.00", total: "2500.00" },
      ],
    },
    {
      id: "inv-bill-003", tenantId: tenant.id, invoiceNo: "INV-2024-003",
      customerName: "Mia Ocampo", customerEmail: "mia@email.com",
      dueDate: shiftDate(monday, -5, 0, 0), subtotal: "1500.00", tax: "180.00", total: "1680.00",
      status: "overdue",
      items: [
        { id: "ii-005", description: "Facial Premium", quantity: 1, unitPrice: "1500.00", total: "1500.00" },
      ],
    },
    {
      id: "inv-bill-004", tenantId: tenant.id, invoiceNo: "INV-2024-004",
      customerName: "Carla Pascual",
      dueDate: shiftDate(monday, 21, 0, 0), subtotal: "800.00", tax: "96.00", total: "896.00",
      status: "draft",
      items: [
        { id: "ii-006", description: "Facial Basic", quantity: 1, unitPrice: "800.00", total: "800.00" },
      ],
    },
  ];

  for (const inv of invoices) {
    const { items, ...invData } = inv;
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        ...invData as any,
        items: { createMany: { data: items, skipDuplicates: true } },
      },
    });
  }
  console.log(`✅ Seeded ${invoices.length} invoices`);

  // ── Job Orders ─────────────────────────────────────────────────────────────
  const jobOrders = [
    { id: "jo-001", tenantId: tenant.id, jobNo: "JO-0001", customerName: "Marco Lim", description: "Hair rebonding + treatment package", status: "in-progress", priority: "high", assignedTo: "Sofia Reyes", dueDate: shiftDate(monday, 2, 0, 0) },
    { id: "jo-002", tenantId: tenant.id, jobNo: "JO-0002", customerName: "Nina Buenaventura", description: "Full body wax + facial combo", status: "pending", priority: "normal", assignedTo: "Ria Gomez", dueDate: shiftDate(monday, 5, 0, 0) },
    { id: "jo-003", tenantId: tenant.id, jobNo: "JO-0003", customerName: "Tricia Villanueva", description: "Gel nail set – hands and feet", status: "completed", priority: "normal", assignedTo: "Mark Dela Cruz", dueDate: shiftDate(monday, -2, 0, 0), completedAt: shiftDate(monday, -3, 0, 0) },
    { id: "jo-004", tenantId: tenant.id, jobNo: "JO-0004", customerName: "Beth Santos", description: "Balayage color with toning", status: "pending", priority: "urgent", assignedTo: "Lena Torres", dueDate: shiftDate(monday, 1, 0, 0) },
    { id: "jo-005", tenantId: tenant.id, jobNo: "JO-0005", customerName: "Dana Reyes", description: "Deep conditioning hair mask", status: "cancelled", priority: "low", dueDate: shiftDate(monday, -1, 0, 0) },
  ];
  for (const jo of jobOrders) {
    await prisma.jobOrder.upsert({ where: { id: jo.id }, update: {}, create: jo as any });
  }
  console.log(`✅ Seeded ${jobOrders.length} job orders`);

  // ── Attendance ─────────────────────────────────────────────────────────────
  const attendanceDays = [-4, -3, -2, -1, 0];
  let attId = 1;
  for (const emp of employees) {
    for (const daysAgo of attendanceDays) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + daysAgo + 7); // relative to this week's monday
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);
      const clockIn = new Date(dateOnly);
      clockIn.setHours(9, Math.floor(Math.random() * 15), 0, 0);
      const clockOut = new Date(dateOnly);
      clockOut.setHours(18, Math.floor(Math.random() * 30), 0, 0);
      const attIdStr = `att-${String(attId).padStart(3, "0")}`;
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: dateOnly } },
        update: {},
        create: { id: attIdStr, tenantId: tenant.id, employeeId: emp.id, date: dateOnly, clockIn, clockOut },
      });
      attId++;
    }
  }
  console.log("✅ Seeded attendance records");

  // ── Leave Requests ─────────────────────────────────────────────────────────
  const leaveRequests = [
    { id: "lv-001", tenantId: tenant.id, employeeId: "emp-001", type: "vacation", startDate: shiftDate(monday, 14, 0, 0), endDate: shiftDate(monday, 18, 0, 0), reason: "Family trip", status: "approved" },
    { id: "lv-002", tenantId: tenant.id, employeeId: "emp-003", type: "sick", startDate: shiftDate(monday, -2, 0, 0), endDate: shiftDate(monday, -1, 0, 0), reason: "Fever and flu", status: "approved" },
    { id: "lv-003", tenantId: tenant.id, employeeId: "emp-002", type: "personal", startDate: shiftDate(monday, 7, 0, 0), endDate: shiftDate(monday, 7, 0, 0), reason: "Personal matters", status: "pending" },
    { id: "lv-004", tenantId: tenant.id, employeeId: "emp-004", type: "vacation", startDate: shiftDate(monday, 21, 0, 0), endDate: shiftDate(monday, 25, 0, 0), reason: "Annual leave", status: "pending" },
  ];
  for (const lv of leaveRequests) {
    await prisma.leaveRequest.upsert({ where: { id: lv.id }, update: {}, create: lv as any });
  }
  console.log(`✅ Seeded ${leaveRequests.length} leave requests`);

  // ── Payroll ────────────────────────────────────────────────────────────────
  const periodStart = new Date(monday);
  periodStart.setDate(monday.getDate() - 14);
  const periodEnd = new Date(monday);
  periodEnd.setDate(monday.getDate() - 1);

  const payrolls = [
    { id: "pr-001", tenantId: tenant.id, employeeId: "emp-001", periodStart, periodEnd, baseSalary: "12500.00", commission: "450.00", deductions: "1250.00", netPay: "11700.00", status: "paid" },
    { id: "pr-002", tenantId: tenant.id, employeeId: "emp-002", periodStart, periodEnd, baseSalary: "11000.00", commission: "360.00", deductions: "1100.00", netPay: "10260.00", status: "processed" },
    { id: "pr-003", tenantId: tenant.id, employeeId: "emp-003", periodStart, periodEnd, baseSalary: "9000.00", commission: "140.00", deductions: "900.00", netPay: "8240.00", status: "draft" },
    { id: "pr-004", tenantId: tenant.id, employeeId: "emp-004", periodStart, periodEnd, baseSalary: "10000.00", commission: "300.00", deductions: "1000.00", netPay: "9300.00", status: "draft" },
  ];
  for (const pr of payrolls) {
    await prisma.payrollRecord.upsert({ where: { id: pr.id }, update: {}, create: pr as any });
  }
  console.log(`✅ Seeded ${payrolls.length} payroll records`);

  console.log("\n✨ Seed complete!");
  console.log("\n📋 Demo login credentials:");
  console.log("   Super Admin  : admin@bizconnect.app / SuperAdmin123!");
  console.log("   Tenant Owner : owner@demo.com / DemoAdmin123!  →  /demo/dashboard");
  console.log("   Tenant Admin : admin@demo.com / Member123!");
  console.log("   Tenant Staff : staff@demo.com / Member123!");
}

/** Returns a Date offset by `daysOffset` days from `base`, at hour:minute */
function shiftDate(base: Date, daysOffset: number, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
