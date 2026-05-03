"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bizconnect/db";
import { authorize } from "@/lib/authorize";
import { getActiveBranchId } from "@/lib/branch";
import { serialize } from "@/lib/serialize";
import {
  createInvoiceSchema,
  logFollowUpSchema,
  recordInvoicePaymentSchema,
  type CreateInvoiceInput,
  type LogFollowUpInput,
  type RecordInvoicePaymentInput,
} from "./schema";

function isMissingLinkedCustomerColumn(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("customer_id") || message.includes("job_order_id");
}

function isMissingInvoiceBalanceColumn(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("amount_paid") || message.includes("balance_due");
}

function isMissingInvoiceActivityTable(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("invoice_activities");
}

function generateInvoiceNo() {
  const date = new Date();
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${rand}`;
}

async function logInvoiceActivity(
  tx: typeof prisma,
  tenantId: string,
  branchId: string | null,
  invoiceId: string,
  type: string,
  notes?: string | null
) {
  await tx.invoiceActivity.create({
    data: {
      tenantId,
      branchId,
      invoiceId,
      type,
      notes: notes ?? null,
    },
  });
}

export async function createInvoice(
  tenantSlug: string,
  tenantId: string,
  input: CreateInvoiceInput
) {
  await authorize(tenantSlug, "billing.create");
  const parsed = createInvoiceSchema.parse(input);
  const branchId = await getActiveBranchId();
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
  const balanceDue = total;

  let invoice;
  try {
    invoice = await prisma.invoice.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        customerId: customer?.id ?? null,
        jobOrderId: parsed.jobOrderId || null,
        invoiceNo: generateInvoiceNo(),
        customerName: customer?.name ?? parsed.customerName,
        customerEmail: customer?.email ?? parsed.customerEmail ?? null,
        dueDate: new Date(parsed.dueDate),
        subtotal,
        tax,
        total,
        amountPaid: 0,
        balanceDue,
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
    if (isMissingInvoiceBalanceColumn(error)) {
      throw new Error("Apply the latest database migration to enable invoice balances and payment history.");
    }
    if (!isMissingLinkedCustomerColumn(error)) throw error;

    invoice = await prisma.invoice.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        invoiceNo: generateInvoiceNo(),
        customerName: customer?.name ?? parsed.customerName,
        customerEmail: customer?.email ?? parsed.customerEmail ?? null,
        dueDate: new Date(parsed.dueDate),
        subtotal,
        tax,
        total,
        amountPaid: 0,
        balanceDue,
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

async function applyInvoicePayment(
  tenantSlug: string,
  tenantId: string,
  invoiceId: string,
  input: RecordInvoicePaymentInput
) {
  const parsed = recordInvoicePaymentSchema.parse(input);
  const branchId = await getActiveBranchId();

  const payment = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId, tenantId },
      select: {
        id: true,
        total: true,
        amountPaid: true,
        balanceDue: true,
        status: true,
      },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "void") throw new Error("Voided invoices cannot receive payments");

    const balanceDue = Number(invoice.balanceDue);
    if (balanceDue <= 0) throw new Error("This invoice is already fully paid");
    if (parsed.amount > balanceDue + 0.0001) {
      throw new Error("Payment amount exceeds the outstanding balance");
    }

    const nextAmountPaid = Number(invoice.amountPaid) + parsed.amount;
    const nextBalanceDue = Math.max(0, Number(invoice.total) - nextAmountPaid);
    const isPaidInFull = nextBalanceDue <= 0.0001;

    const createdPayment = await tx.invoicePayment.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        invoiceId,
        amount: parsed.amount,
        paymentMethod: parsed.paymentMethod,
        notes: parsed.notes || null,
        receivedAt: new Date(parsed.receivedAt),
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId, tenantId },
      data: {
        amountPaid: nextAmountPaid,
        balanceDue: nextBalanceDue,
        status: isPaidInFull ? "paid" : "partial",
        paidAt: isPaidInFull ? new Date(parsed.receivedAt) : null,
      },
    });

    await logInvoiceActivity(
      tx,
      tenantId,
      branchId ?? null,
      invoiceId,
      "payment_recorded",
      parsed.notes || `Payment recorded via ${parsed.paymentMethod.replace("_", " ")}`
    );

    return createdPayment;
  });

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(payment);
}

export async function recordInvoicePayment(
  tenantSlug: string,
  tenantId: string,
  invoiceId: string,
  input: RecordInvoicePaymentInput
) {
  await authorize(tenantSlug, "billing.mark_paid");
  return applyInvoicePayment(tenantSlug, tenantId, invoiceId, input);
}

export async function markInvoicePaid(tenantSlug: string, tenantId: string, invoiceId: string) {
  await authorize(tenantSlug, "billing.mark_paid");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, tenantId },
    select: { balanceDue: true, status: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "void") throw new Error("Voided invoices cannot be marked as paid");
  if (Number(invoice.balanceDue) <= 0) throw new Error("This invoice is already fully paid");

  const payment = await applyInvoicePayment(tenantSlug, tenantId, invoiceId, {
    amount: Number(invoice.balanceDue),
    paymentMethod: "cash",
    notes: "Marked as paid",
    receivedAt: new Date().toISOString(),
  });

  return payment;
}

export async function voidInvoice(tenantSlug: string, tenantId: string, invoiceId: string) {
  await authorize(tenantSlug, "billing.edit");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, tenantId },
    select: { amountPaid: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (Number(invoice.amountPaid) > 0) {
    throw new Error("Invoices with recorded payments cannot be voided");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { status: "void" },
  });

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(updated);
}

export async function sendInvoice(tenantSlug: string, tenantId: string, invoiceId: string) {
  await authorize(tenantSlug, "billing.edit");
  const branchId = await getActiveBranchId();

  let invoice;
  try {
    invoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoiceId, tenantId },
        data: { status: "sent" },
      });

      await logInvoiceActivity(tx, tenantId, branchId ?? null, invoiceId, "invoice_sent", "Initial invoice issue recorded");
      return updated;
    });
  } catch (error) {
    if (isMissingInvoiceActivityTable(error)) {
      throw new Error("Apply the latest database migration to track invoice reminders and activity.");
    }
    throw error;
  }

  revalidatePath(`/${tenantSlug}/billing`);
  return serialize(invoice);
}

export async function sendReminder(
  tenantSlug: string,
  tenantId: string,
  invoiceId: string,
  input?: LogFollowUpInput
) {
  await authorize(tenantSlug, "billing.edit");
  const branchId = await getActiveBranchId();
  const parsed = logFollowUpSchema.parse(input ?? { channel: "phone", notes: "Manual follow-up recorded" });

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, tenantId },
      select: { id: true, status: true, balanceDue: true },
    });

    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "void") throw new Error("Voided invoices cannot receive reminders");
    if (Number(invoice.balanceDue) <= 0) throw new Error("Paid invoices do not need reminders");

    const activity = await prisma.invoiceActivity.create({
      data: {
        tenantId,
        branchId: branchId ?? null,
        invoiceId,
        type: "follow_up_logged",
        notes: `${parsed.channel.replace("_", " ")}: ${parsed.notes}`,
      },
    });

    revalidatePath(`/${tenantSlug}/billing`);
    return serialize(activity);
  } catch (error) {
    if (isMissingInvoiceActivityTable(error)) {
      throw new Error("Apply the latest database migration to track invoice reminders and activity.");
    }
    throw error;
  }
}
