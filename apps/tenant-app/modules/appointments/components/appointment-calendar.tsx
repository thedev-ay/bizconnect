"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Clock, User, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "../types";
import { updateAppointmentStatus } from "../actions";

interface AppointmentCalendarProps {
  appointments: Appointment[];
  tenantSlug: string;
  tenantId: string;
  onSelectSlot?: (start: Date, end: Date) => void;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  "in-progress": "#8b5cf6",
  done: "#22c55e",
  cancelled: "#ef4444",
  "no-show": "#9ca3af",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-700 border-blue-200",
  completed: "bg-green-500/15 text-green-700 border-green-200",
  cancelled: "bg-red-500/15 text-red-700 border-red-200",
  "no-show": "bg-gray-500/15 text-gray-600 border-gray-200",
};

export function AppointmentCalendar({
  appointments,
  tenantSlug,
  tenantId,
  onSelectSlot,
}: AppointmentCalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  const events = appointments.map((appt) => ({
    id: appt.id,
    title: appt.title,
    start: new Date(appt.startAt),
    end: new Date(appt.endAt),
    backgroundColor: STATUS_COLOR[appt.status] ?? "#6b7280",
    borderColor: STATUS_COLOR[appt.status] ?? "#6b7280",
    extendedProps: { appointment: appt },
  }));

  function handleEventClick(info: EventClickArg) {
    const appt = info.event.extendedProps.appointment as Appointment;
    setSelected(appt);
  }

  function handleDateSelect(info: DateSelectArg) {
    if (onSelectSlot) {
      onSelectSlot(info.start, info.end);
    }
    calendarRef.current?.getApi().unselect();
  }

  async function handleStatus(id: string, status: string, msg: string) {
    setLoading(true);
    try {
      await updateAppointmentStatus(tenantSlug, tenantId, id, status);
      toast.success(msg);
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fullcalendar-wrapper">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
            list: "List",
          }}
          events={events}
          selectable={!!onSelectSlot}
          selectMirror
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDisplay="block"
          dayMaxEvents={3}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          nowIndicator
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
        />
      </div>

      {/* Appointment detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <Badge
                variant="outline"
                className={cn("capitalize", STATUS_BADGE[selected.status])}
              >
                {selected.status}
              </Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    {format(new Date(selected.startAt), "MMM d, yyyy · h:mm a")} –{" "}
                    {format(new Date(selected.endAt), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>{selected.customerName}</span>
                </div>
                {selected.customerPhone && (
                  <div className="pl-6 text-muted-foreground">{selected.customerPhone}</div>
                )}
                {selected.employeeName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span>{selected.employeeName}</span>
                  </div>
                )}
                {selected.notes && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">{selected.notes}</p>
                )}
              </div>

              {(selected.status === "pending" || selected.status === "confirmed" || selected.status === "in-progress") && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => {
                      const next = selected.status === "pending" ? "confirmed"
                        : selected.status === "confirmed" ? "in-progress"
                        : "done";
                      const msg = next === "confirmed" ? "Confirmed" : next === "in-progress" ? "Started" : "Completed";
                      handleStatus(selected.id, next, msg);
                    }}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    {selected.status === "pending" ? "Confirm" : selected.status === "confirmed" ? "Start" : "Complete"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={loading} />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatus(selected.id, "no-show", "Marked as no-show")
                        }
                      >
                        <XCircle className="mr-2 h-4 w-4" /> No-Show
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          handleStatus(selected.id, "cancelled", "Appointment cancelled")
                        }
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
