export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  reorderAt: number;
  unitCost: string; // Decimal serialized as string
  unitPrice: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryCategory {
  id: string;
  name: string;
}
