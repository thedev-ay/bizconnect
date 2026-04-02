"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobOrder } from "../types";
import { updateJobOrderStatus } from "../actions";

interface JobOrderListProps {
  jobOrders: JobOrder[];
  tenantSlug: string;
  tenantId: string;
}

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const PRIORITY_PILL: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-500 border-zinc-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

export function JobOrderList({ jobOrders, tenantSlug, tenantId }: JobOrderListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStatus(id: string, status: string, msg: string) {
    setLoading(id);
    try {
      await updateJobOrderStatus(tenantSlug, tenantId, id, status);
      toast.success(msg);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-100 hover:bg-transparent">
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Job No.</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Customer</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Description</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Priority</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Assigned To</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Due Date</TableHead>
          <TableHead className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobOrders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-12 text-center text-sm text-zinc-400">
              No job orders yet.
            </TableCell>
          </TableRow>
        ) : (
          jobOrders.map((jo) => {
            const isOverdue =
              jo.status !== "completed" &&
              jo.status !== "cancelled" &&
              jo.dueDate &&
              new Date(jo.dueDate) < new Date();

            return (
              <TableRow
                key={jo.id}
                className={cn("border-zinc-100 hover:bg-zinc-50/50", loading === jo.id && "opacity-50")}
              >
                <TableCell className="font-mono text-sm font-medium text-zinc-900">{jo.jobNo}</TableCell>
                <TableCell className="text-sm font-medium text-zinc-900">{jo.customerName}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-zinc-500">
                  {jo.description}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    PRIORITY_PILL[jo.priority] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {jo.priority}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">{jo.assignedTo ?? <span className="text-zinc-300">—</span>}</TableCell>
                <TableCell className={isOverdue ? "text-red-600" : "text-zinc-500"}>
                  <span className="text-sm">
                    {jo.dueDate ? format(new Date(jo.dueDate), "MMM d, yyyy") : <span className="text-zinc-300">—</span>}
                  </span>
                  {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_PILL[jo.status] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                  )}>
                    {jo.status.replace("-", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  {jo.status !== "completed" && jo.status !== "cancelled" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-700" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {jo.status === "pending" && (
                          <DropdownMenuItem
                            onClick={() => handleStatus(jo.id, "in-progress", "Job order started")}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" /> Start
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleStatus(jo.id, "completed", "Job order completed")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Complete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleStatus(jo.id, "cancelled", "Job order cancelled")}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
