import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getCurrencyConfig, prisma } from "../src";

const REQUIRED_MODULES = ["users", "crm", "services", "job-orders", "billing", "reports"] as const;

async function testLocaleMapping() {
  const nl = getCurrencyConfig("nl");
  assert.equal(nl.symbol, "€");
  assert.equal(nl.locale, "nl-NL");
}

async function testServiceShopWorkflow() {
  const runId = randomUUID().slice(0, 8);
  const slug = `svc-test-${runId}`;
  const invoiceNo = `INV-TEST-${runId}`;
  const jobNo = `JO-TEST-${runId}`;

  const moduleRows = await prisma.module.findMany({
    where: {
      slug: {
        in: [...REQUIRED_MODULES],
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  assert.equal(moduleRows.length, REQUIRED_MODULES.length, "Expected service-shop modules to exist");

  const tenant = await prisma.tenant.create({
    data: {
      name: `Service Shop Test ${runId}`,
      slug,
      country: "nl",
      currencySymbol: "€",
      currencyLocale: "nl-NL",
      tenantModules: {
        create: moduleRows.map((module) => ({
          moduleId: module.id,
          isEnabled: true,
        })),
      },
    },
  });

  try {
    const enabledModules = await prisma.tenantModule.findMany({
      where: { tenantId: tenant.id, isEnabled: true },
      select: { module: { select: { slug: true } } },
    });

    assert.deepEqual(
      new Set(enabledModules.map((tm) => tm.module.slug)),
      new Set(REQUIRED_MODULES),
      "Tenant should have the full service-shop module bundle enabled"
    );

    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: "Regression Customer",
        email: `customer-${runId}@example.com`,
        phone: "+31 6 12345678",
      },
    });

    const jobOrder = await prisma.jobOrder.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        jobNo,
        customerName: customer.name,
        contactNo: customer.phone,
        status: "completed",
        completedAt: new Date(),
        items: {
          create: [
            {
              name: "Repair Labor",
              quantity: 1,
              unitPrice: 75,
              total: 75,
            },
          ],
        },
      },
      include: { items: true },
    });

    assert.equal(jobOrder.customerId, customer.id);
    assert.equal(jobOrder.items.length, 1);

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        jobOrderId: jobOrder.id,
        invoiceNo,
        customerName: customer.name,
        customerEmail: customer.email,
        dueDate: new Date(),
        subtotal: 75,
        tax: 0,
        total: 75,
        status: "draft",
        items: {
          create: [
            {
              description: "Repair Labor",
              quantity: 1,
              unitPrice: 75,
              total: 75,
            },
          ],
        },
      },
    });

    const linkedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      select: {
        customerId: true,
        jobOrderId: true,
        status: true,
        total: true,
      },
    });

    assert.ok(linkedInvoice);
    assert.equal(linkedInvoice.customerId, customer.id);
    assert.equal(linkedInvoice.jobOrderId, jobOrder.id);
    assert.equal(Number(linkedInvoice.total), 75);

    const paidInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid", paidAt: new Date() },
      select: { status: true, paidAt: true },
    });

    assert.equal(paidInvoice.status, "paid");
    assert.ok(paidInvoice.paidAt);

    const crossTenantRead = await prisma.jobOrder.findFirst({
      where: {
        id: jobOrder.id,
        tenantId: { not: tenant.id },
      },
    });

    assert.equal(crossTenantRead, null, "Job order should not leak across tenants");
  } finally {
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
  }
}

async function main() {
  await testLocaleMapping();
  await testServiceShopWorkflow();
  console.log("Service-shop regression checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
