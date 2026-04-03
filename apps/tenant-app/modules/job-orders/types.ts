export interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  type: "active" | "completed" | "cancelled";
}

export const STAGE_COLOR_MAP: Record<string, { pill: string; tab: string; card: string; btn: string }> = {
  zinc:    { pill: "bg-zinc-100 text-zinc-700 border-zinc-200",         tab: "bg-zinc-100 text-zinc-700",          card: "border-zinc-200 hover:border-zinc-300",       btn: "bg-zinc-900 text-white hover:bg-zinc-700" },
  blue:    { pill: "bg-blue-50 text-blue-700 border-blue-200",          tab: "bg-blue-100 text-blue-700",           card: "border-blue-200 hover:border-blue-300",       btn: "bg-blue-600 text-white hover:bg-blue-700" },
  orange:  { pill: "bg-orange-50 text-orange-700 border-orange-200",    tab: "bg-orange-100 text-orange-700",       card: "border-orange-200 hover:border-orange-300",   btn: "bg-orange-600 text-white hover:bg-orange-700" },
  violet:  { pill: "bg-violet-50 text-violet-700 border-violet-200",    tab: "bg-violet-100 text-violet-700",       card: "border-violet-200 hover:border-violet-300",   btn: "bg-violet-600 text-white hover:bg-violet-700" },
  emerald: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", tab: "bg-emerald-100 text-emerald-700",     card: "border-emerald-200 hover:border-emerald-300", btn: "bg-emerald-600 text-white hover:bg-emerald-700" },
  red:     { pill: "bg-red-50 text-red-600 border-red-200",             tab: "bg-red-100 text-red-700",             card: "border-red-200 hover:border-red-300",         btn: "bg-red-600 text-white hover:bg-red-700" },
  amber:   { pill: "bg-amber-50 text-amber-700 border-amber-200",       tab: "bg-amber-100 text-amber-700",         card: "border-amber-200 hover:border-amber-300",     btn: "bg-amber-600 text-white hover:bg-amber-700" },
  sky:     { pill: "bg-sky-50 text-sky-700 border-sky-200",             tab: "bg-sky-100 text-sky-700",             card: "border-sky-200 hover:border-sky-300",         btn: "bg-sky-600 text-white hover:bg-sky-700" },
};

export function getStageColors(color: string) {
  return STAGE_COLOR_MAP[color] ?? STAGE_COLOR_MAP.zinc;
}

export function getNextStage(stages: WorkflowStage[], currentSlug: string): WorkflowStage | null {
  const active = stages.filter((s) => s.type === "active").sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = active.findIndex((s) => s.slug === currentSlug);
  if (idx === -1 || idx === active.length - 1) return null;
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
