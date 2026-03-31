import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
});

export const createInvoiceSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  dueDate: z.string().min(1, "Due date is required"),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
