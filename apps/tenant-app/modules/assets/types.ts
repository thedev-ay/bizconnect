export type AssetStatus = "active" | "inactive" | "archived";

export interface Asset {
  id: string;
  tenantId: string;
  branchId: string | null;
  customerId: string;
  name: string;
  assetType: string;
  brand: string | null;
  model: string | null;
  identifier: string | null;
  serialNo: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  branch: {
    id: string;
    name: string;
  } | null;
  openJobCount: number;
  invoiceCount: number;
  recentJobOrders: Array<{
    id: string;
    jobNo: string;
    status: string;
    customerName: string;
    createdAt: Date;
    invoiceId: string | null;
    invoiceStatus: string | null;
  }>;
}
