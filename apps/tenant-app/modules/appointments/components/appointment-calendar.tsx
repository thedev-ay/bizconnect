"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import { format } from "date-fns";
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
  slotMinTime?: string;
  slotMaxTime?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  "in-progress": "#8b5cf6",
  done: "#22c55e",
  cancelled: "#ef4444",
  "no-show": "#9ca3af",
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  "in-progress": "bg-violet-50 text-violet-700 border-violet-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
  "no-show": "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_PILL[status] ?? "bg-zinc-100 text-zinc-500")}>
      {status.replace("-", " ")}
    </span>
  );
}

function addOneHour(t: string): string {
  const parts = t.split(":");
  const h = Math.min(Number(parts[0]) + 1, 24);
  return [String(h).padStart(2, "0"), parts[1] ?? "00", parts[2] ?? "00"].join(":");
}

function toFullCalendarTime(t?: string, fallback = "07:00:00"): string {
  if (!t) return fallback;
  return t.length === 5 ? t + ":00" : t;
}

function calcCalendarHeight(min?: string, max?: string): number {
  const parseHour = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h + (m ?? 0) / 60;
  };
  const start = parseHour(min ?? "07:00");
  const end = parseHour(max ?? "21:00") + 1; // +1 because we extend max by 1h
  const hours = Math.max(end - start, 4);
  return Math.round(hours * 56 + 160);
}

export function AppointmentCalendar({
  appointments,
  tenantSlug,
  tenantId,
  onSelectSlot,
  slotMinTime,
  slotMaxTime,
}: AppointmentCalendarProps) {
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  const events = appointments.map((appt) => ({
    id: appt.id,
    title: appt.customerName,
    start: new Date(appt.startAt),
    end: new Date(appt.endAt),
    backgroundColor: STATUS_COLOR[appt.status] ?? "#6b7280",
    borderColor: "transparent",
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
      queryClient.invalidateQueries({ queryKey: ["appointments", tenantSlug] });
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
          initialView="timeGridWeek"
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
          eventContent={(arg) => {
            const appt = arg.event.extendedProps.appointment as Appointment | undefined;
            const timeText = arg.timeText;
            if (!appt) return <div className="px-1.5 py-0.5 text-[10px]">{timeText}</div>;
            const durationMins = (new Date(appt.endAt).getTime() - new Date(appt.startAt).getTime()) / 60000;
            const isShort = durationMins < 60;
            const isMedium = durationMins === 60;
            return (
              <div className="flex h-full flex-col gap-px overflow-hidden px-1.5 py-0.5">
                {timeText && (
                  <p className="truncate text-[10px] leading-tight opacity-80">{timeText}</p>
                )}
                {appt.serviceName && (
                  <p className="truncate text-[11px] font-bold leading-tight">{appt.serviceName}</p>
                )}
                {!isShort && !isMedium && (
                  <p className="truncate text-[10px] leading-tight opacity-90">{appt.customerName}</p>
                )}
                {!isShort && appt.employeeName && (
                  <p className="truncate text-[10px] leading-tight opacity-75">{appt.employeeName}</p>
                )}
              </div>
            );
          }}
          height={calcCalendarHeight(slotMinTime, slotMaxTime)}
          slotMinTime={toFullCalendarTime(slotMinTime, "07:00:00")}
          slotMaxTime={addOneHour(toFullCalendarTime(slotMaxTime, "21:00:00"))}
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          eventMinHeight={40}
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
            <DialogTitle className="text-base font-semibold text-zinc-900">
              {selected?.serviceName ?? selected?.customerName}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Status badge */}
              <div>
                <StatusPill status={selected.status} />
              </div>

              {/* Details */}
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 divide-y divide-zinc-100">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <span className="text-sm text-zinc-700">
                    {format(new Date(selected.startAt), "MMM d, yyyy · h:mm a")}
                    {" – "}
                    {format(new Date(selected.endAt), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-700">{selected.customerName}</p>
                    {selected.customerPhone && (
                      <p className="text-xs text-zinc-400">{selected.customerPhone}</p>
                    )}
                    {selected.customerEmail && (
                      <p className="text-xs text-zinc-400">{selected.customerEmail}</p>
                    )}
                  </div>
                </div>
                {selected.serviceName && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="text-sm text-zinc-700">{selected.serviceName}</span>
                  </div>
                )}
                {selected.employeeName && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="text-sm text-zinc-700">{selected.employeeName}</span>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                  <p className="mb-1 text-xs font-medium text-zinc-400">Notes</p>
                  <p className="text-sm text-zinc-600">{selected.notes}</p>
                </div>
              )}

              {/* Actions */}
              {(selected.status === "pending" || selected.status === "confirmed" || selected.status === "in-progress") && (
                <div className="flex gap-2">
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
                      <DropdownMenuItem onClick={() => handleStatus(selected.id, "no-show", "Marked as no-show")}>
                        <XCircle className="mr-2 h-4 w-4" /> No-Show
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleStatus(selected.id, "cancelled", "Appointment cancelled")}
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
