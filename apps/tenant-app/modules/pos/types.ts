export interface CartItem {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Sale {
  id: string;
  referenceNo: string;
  subtotal: string;
  discount: string;
  total: string;
  amountPaid: string;
  change: string;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  items: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }[];
}
