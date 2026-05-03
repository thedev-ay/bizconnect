export interface Invoice {
  id: string;
  customerId?: string | null;
  jobOrderId?: string | null;
  invoiceNo: string;
  customerName: string;
  customerEmail: string | null;
  dueDate: Date;
  subtotal: string;
  tax: string;
  total: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  activities: InvoiceActivity[];
  items: InvoiceLineItem[];
  payments: InvoicePayment[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface InvoicePayment {
  id: string;
  amount: string;
  paymentMethod: string;
  notes: string | null;
  receivedAt: Date;
  createdAt: Date;
}

export interface InvoiceActivity {
  id: string;
  type: string;
  notes: string | null;
  createdAt: Date;
}
