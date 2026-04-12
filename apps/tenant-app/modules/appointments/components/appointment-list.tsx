"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnlineStatus } from "@/lib/use-online-status";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import type { Appointment } from "../types";
import { updateAppointmentStatus } from "../actions";

interface AppointmentListProps {
  appointments: Appointment[];
  tenantSlug: string;
  tenantId: string;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  scheduled: "secondary",
  completed: "default",
  cancelled: "destructive",
  "no-show": "outline",
};

export function AppointmentList({ appointments, tenantSlug, tenantId }: AppointmentListProps) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStatus(id: string, status: string, msg: string) {
    if (!isOnline) { toast.error("You're offline. Connect to update appointments."); return; }
    setLoading(id);
    try {
      await updateAppointmentStatus(tenantSlug, tenantId, id, status);
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["appointments", tenantSlug] });
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
          <TableHead>Title</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
              No appointments yet.
            </TableCell>
          </TableRow>
        ) : (
          appointments.map((appt) => (
            <TableRow key={appt.id} className={loading === appt.id ? "opacity-50" : ""}>
              <TableCell className="font-medium">{appt.title}</TableCell>
              <TableCell>
                <div>{appt.customerName}</div>
                {appt.customerPhone && (
                  <div className="text-xs text-muted-foreground">{appt.customerPhone}</div>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(appt.startAt), "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(appt.endAt), "h:mm a")}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {appt.employeeName ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[appt.status] ?? "outline"} className="capitalize">
                  {appt.status}
                </Badge>
              </TableCell>
              <TableCell>
                {appt.status === "scheduled" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8"></Button>}>
                      
                        <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStatus(appt.id, "completed", "Marked as completed")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatus(appt.id, "no-show", "Marked as no-show")}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> No-Show
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleStatus(appt.id, "cancelled", "Appointment cancelled")}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
