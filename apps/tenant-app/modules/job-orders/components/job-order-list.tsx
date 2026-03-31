"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
import type { JobOrder } from "../types";
import { updateJobOrderStatus } from "../actions";

interface JobOrderListProps {
  jobOrders: JobOrder[];
  tenantSlug: string;
  tenantId: string;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  "in-progress": "secondary",
  completed: "default",
  cancelled: "destructive",
};

const PRIORITY_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  normal: "secondary",
  high: "default",
  urgent: "destructive",
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
        <TableRow>
          <TableHead>Job No.</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobOrders.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
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
              <TableRow key={jo.id} className={loading === jo.id ? "opacity-50" : ""}>
                <TableCell className="font-mono text-sm font-medium">{jo.jobNo}</TableCell>
                <TableCell className="font-medium">{jo.customerName}</TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {jo.description}
                </TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_BADGE[jo.priority] ?? "outline"} className="capitalize">
                    {jo.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{jo.assignedTo ?? "—"}</TableCell>
                <TableCell className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                  {jo.dueDate ? format(new Date(jo.dueDate), "MMM d, yyyy") : "—"}
                  {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[jo.status] ?? "outline"} className="capitalize">
                    {jo.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {jo.status !== "completed" && jo.status !== "cancelled" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"/>}>
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
