export type LaundryStatus =
  | "received"
  | "washing"
  | "drying"
  | "folding"
  | "ready"
  | "claimed"
  | "cancelled";

export const LAUNDRY_STATUSES: LaundryStatus[] = [
  "received",
  "washing",
  "drying",
  "folding",
  "ready",
  "claimed",
];

export const STATUS_LABEL: Record<LaundryStatus, string> = {
  received: "Received",
  washing: "Washing",
  drying: "Drying",
  folding: "Folding",
  ready: "Ready",
  claimed: "Claimed",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<LaundryStatus, { pill: string; header: string }> = {
  received: { pill: "bg-zinc-100 text-zinc-700 border-zinc-200", header: "bg-zinc-50 border-zinc-200" },
  washing:  { pill: "bg-blue-50 text-blue-700 border-blue-200",  header: "bg-blue-50 border-blue-200" },
  drying:   { pill: "bg-orange-50 text-orange-700 border-orange-200", header: "bg-orange-50 border-orange-200" },
  folding:  { pill: "bg-violet-50 text-violet-700 border-violet-200", header: "bg-violet-50 border-violet-200" },
  ready:    { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", header: "bg-emerald-50 border-emerald-200" },
  claimed:  { pill: "bg-zinc-100 text-zinc-500 border-zinc-200", header: "bg-zinc-50 border-zinc-200" },
  cancelled: { pill: "bg-red-50 text-red-600 border-red-200",   header: "bg-red-50 border-red-200" },
};

export const NEXT_STATUS: Partial<Record<LaundryStatus, LaundryStatus>> = {
  received: "washing",
  washing:  "drying",
  drying:   "folding",
  folding:  "ready",
  ready:    "claimed",
};

export const NEXT_STATUS_LABEL: Partial<Record<LaundryStatus, string>> = {
  received: "Start Washing",
  washing:  "Move to Drying",
  drying:   "Move to Folding",
  folding:  "Mark Ready",
  ready:    "Mark Claimed",
};

export interface JobOrderItem {
  id: string;
  name: string;
  quantity: number;
  weight: string | null;
  unitPrice: string;
  total: string;
}

export interface JobOrder {
  id: string;
  jobNo: string;
  customerName: string;
  contactNo: string | null;
  notes: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  claimedAt: Date | null;
  createdAt: Date;
  items: JobOrderItem[];
}
