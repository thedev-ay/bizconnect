export interface CartItem {
  itemId: string;
  itemType: "product" | "service";
  name: string;
  unitPrice: number;        // effective price after promo
  originalPrice: number;    // price before promo
  promoDiscount: number;    // discount per unit from promo
  promoLabel: string | null;
  quantity: number;
  weight: number | null;    // kg, for per_kilo services
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
