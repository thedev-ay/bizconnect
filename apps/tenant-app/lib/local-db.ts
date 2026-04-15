import Dexie, { type Table } from "dexie";

// ── Branches ───────────────────────────────────────────────────────────────
export interface LocalBranch {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

// ── Inventory ──────────────────────────────────────────────────────────────
export interface LocalInventoryItem {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  reorderAt: number;
  unitCost: string;
  unitPrice: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface LocalInventoryAdjustment {
  id: string;
  tenantId: string;
  branchId: string | null;
  itemId: string;
  quantityChange: number;
  reason: string;
  notes: string | null;
  createdAt: string;
  itemName: string;
}

// ── POS ────────────────────────────────────────────────────────────────────
export interface LocalPOSPromotion {
  id: string;
  type: string;
  value: number;
  buyQty: number | null;
  getQty: number | null;
  daysOfWeek: number[] | null;
  startTime: string | null;
  endTime: string | null;
}

export interface LocalPOSProduct {
  id: string;
  tenantId: string;
  branchId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  sku: string | null;
  category: string | null;
  promotions: LocalPOSPromotion[];
}

export interface LocalPOSService {
  id: string;
  tenantId: string;
  name: string;
  pricingType: "per_piece" | "per_kilo" | "flat";
  price: number;
  category: string | null;
}

// ── Sync metadata ──────────────────────────────────────────────────────────
export interface SyncRecord {
  key: string; // e.g. "inventory:tenant-slug", "pos-products:tenant-slug"
  syncedAt: number; // Date.now()
}

// ── Sales history ──────────────────────────────────────────────────────────
export interface LocalSale {
  id: string;
  tenantId: string;
  referenceNo: string;
  source: string;
  subtotal: string;
  discount: string;
  total: string;
  amountPaid: string;
  change: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  servedByName: string | null;
  items: { id: string; name: string; quantity: number; unitPrice: string; total: string }[];
  returns: {
    id: string;
    referenceNo: string;
    reason: string;
    notes: string | null;
    status: string;
    refundAmount: string | null;
    refundMethod: string | null;
    approvedAt: string | null;
    refundedAt: string | null;
    createdAt: string;
    items: { id: string; saleItemId: string; quantity: number }[];
  }[];
}

// ── Job orders ─────────────────────────────────────────────────────────────
export interface LocalJobOrdersSnapshot {
  key: string; // "job-orders:tenant-slug"
  tenantId: string;
  data: string; // JSON blob of full JobOrdersData
  savedAt: number;
}

// ── Appointments ───────────────────────────────────────────────────────────
export interface LocalAppointmentsSnapshot {
  key: string; // "appointments:tenant-slug"
  tenantId: string;
  data: string; // JSON blob of full AppointmentsData
  savedAt: number;
}

// ── Pending sales (offline write queue) ────────────────────────────────────
export interface PendingSale {
  id: string;          // local temp ID
  tenantSlug: string;
  tenantId: string;
  referenceNo: string; // local temp reference shown to cashier
  input: {
    items: {
      itemId?: string;
      itemType: "product" | "service";
      name: string;
      quantity: number;
      weight?: number;
      unitPrice: number;
      originalPrice: number;
      promoDiscount: number;
      total: number;
    }[];
    subtotal: number;
    discount: number;
    total: number;
    amountPaid: number;
    paymentMethod: "cash" | "card" | "gcash" | "maya";
  };
  createdAt: number; // Date.now()
  attempts: number;
}

class BizConnectDB extends Dexie {
  inventoryItems!: Table<LocalInventoryItem>;
  inventoryAdjustments!: Table<LocalInventoryAdjustment>;
  posProducts!: Table<LocalPOSProduct>;
  posServices!: Table<LocalPOSService>;
  sales!: Table<LocalSale>;
  jobOrdersSnapshots!: Table<LocalJobOrdersSnapshot>;
  appointmentsSnapshots!: Table<LocalAppointmentsSnapshot>;
  syncMeta!: Table<SyncRecord>;
  pendingSales!: Table<PendingSale>;
  branches!: Table<LocalBranch>;

  constructor() {
    super("bizconnect");
    this.version(1).stores({
      inventoryItems: "id, tenantId",
      inventoryAdjustments: "id, tenantId, itemId",
      posProducts: "id, tenantId",
      posServices: "id, tenantId",
      syncMeta: "key",
    });
    this.version(2).stores({
      pendingSales: "id, tenantId",
      sales: "id, tenantId",
    });
    this.version(3).stores({
      jobOrdersSnapshots: "key, tenantId",
      appointmentsSnapshots: "key, tenantId",
    });
    this.version(4).stores({
      branches: "id, tenantId",
      inventoryItems: "id, tenantId, branchId, [tenantId+branchId]",
      inventoryAdjustments: "id, tenantId, itemId, branchId",
    });
  }
}

export const db = new BizConnectDB();
