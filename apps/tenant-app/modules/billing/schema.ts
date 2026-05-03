import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  jobOrderId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  dueDate: z.string().min(1, "Due date is required"),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export const recordInvoicePaymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.enum(["cash", "card", "gcash", "maya", "bank_transfer", "other"]).default("cash"),
  notes: z.string().max(500).optional().or(z.literal("")),
  receivedAt: z.string().min(1, "Payment date is required"),
});

export const logFollowUpSchema = z.object({
  channel: z.enum(["phone", "email", "sms", "chat", "in_person", "other"]).default("phone"),
  notes: z.string().min(1, "Add a short follow-up note").max(500),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type LogFollowUpInput = z.infer<typeof logFollowUpSchema>;
export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;
