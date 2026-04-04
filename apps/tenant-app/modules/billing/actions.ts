"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { serialize } from "@/lib/serialize";
import { createInvoiceSchema, type CreateInvoiceInput } from "./schema";

function isMissingLinkedCustomerColumn(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("customer_id") || message.includes("job_order_id");
}

function generateInvoiceNo() {
  const date = new Date();
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${rand}`;
}

export async function createInvoice(
  tenantSlug: string,
  tenantId: string,
  input: CreateInvoiceInput
) {
  await authorize(tenantSlug, "billing.create");
  const parsed = createInvoiceSchema.parse(input);
  const customer = parsed.customerId
    ? await prisma.customer.findFirst({
        where: { id: parsed.customerId, tenantId },
        select: { id: true, name: true, email: true },
      })
    : null;

  if (parsed.customerId && !customer) {
    throw new Error("Customer not found");
  }

  if (parsed.jobOrderId) {
    const jobOrder = await prisma.jobOrder.findFirst({
      where: { id: parsed.jobOrderId, tenantId },
      select: { id: true, invoice: { select: { id: true } } },
    });

    if (!jobOrder) throw new Error("Job order not found");
    if (jobOrder.invoice) throw new Error("This job order already has an invoice");
  }

  const subtotal = parsed.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = parsed.tax;
  const total = subtotal + tax;

  let invoice;
  try {
    invoice = await prisma.invoice.create({
      data: {
        tenantId,
        customerId: customer?.id ?? null,
        jobOrderId: parsed.jobOrderId || null,
        invoiceNo: generateInvoiceNo(),
        customerName: customer?.name ?? parsed.customerName,
        customerEmail: customer?.email ?? parsed.customerEmail ?? null,
        dueDate: new Date(parsed.dueDate),
        subtotal,
        tax,
        total,
        notes: parsed.notes || null,
        status: "draft",
        items: {
          create: parsed.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  } catch (error) {
    if (!isMissingLinkedCustomerColumn(error)) throw error;

    invoice = await prisma.invoice.create({
      data: {
        tenantId,
        invoiceNo: generateInvoiceNo(),
        customerName: customer?.name ?? parsed.customerName,
        customerEmail: customer?.email ?? parsed.customerEmail ?? null,
        dueDate: new Date(parsed.dueDate),
        subtotal,
        tax,
        total,
        notes: parsed.notes || null,
        status: "draft",
        items: {
          create: parsed.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
  }

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(invoice);
}

export async function markInvoicePaid(tenantSlug: string, tenantId: string, invoiceId: string) {
  await authorize(tenantSlug, "billing.mark_paid");

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { status: "paid", paidAt: new Date() },
  });

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(invoice);
}

export async function voidInvoice(tenantSlug: string, tenantId: string, invoiceId: string) {
  await authorize(tenantSlug, "billing.edit");

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { status: "void" },
  });

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(invoice);
}

export async function sendInvoice(tenantSlug: string, tenantId: string, invoiceId: string) {
  await authorize(tenantSlug, "billing.edit");

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { status: "sent" },
  });

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(invoice);
}
