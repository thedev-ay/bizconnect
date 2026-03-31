export interface Invoice {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerEmail: string | null;
  dueDate: Date;
  subtotal: string;
  tax: string;
  total: string;
  status: string;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  items: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}
