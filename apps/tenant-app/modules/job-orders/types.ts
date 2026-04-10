export interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  type: "active" | "completed" | "cancelled";
}

export function getNextStage(stages: WorkflowStage[], currentSlug: string): WorkflowStage | null {
  const active = stages.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = active.findIndex((s) => s.slug === currentSlug);
  if (idx === -1) return null;
  if (idx === active.length - 1) {
    return getCompletedStage(stages);
  }
  return active[idx + 1];
}

export function getPrevStage(stages: WorkflowStage[], currentSlug: string): WorkflowStage | null {
  const active = stages.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = active.findIndex((s) => s.slug === currentSlug);
  if (idx <= 0) return null;
  return active[idx - 1];
}

export function getCompletedStage(stages: WorkflowStage[]): WorkflowStage | null {
  return stages.find((s) => s.type === "completed") ?? null;
}

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
  customerId: string | null;
  customerName: string;
  contactNo: string | null;
  notes: string | null;
  status: string;
  priority: string;
  assignedStaff: { employeeId: string; name: string }[];
  dueDate: Date | null;
  completedAt: Date | null;
  claimedAt: Date | null;
  createdAt: Date;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  items: JobOrderItem[];
}
