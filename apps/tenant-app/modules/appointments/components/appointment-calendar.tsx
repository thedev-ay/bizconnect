"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnlineStatus } from "@/lib/use-online-status";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, XCircle, Clock, User, UserCheck, X } from "lucide-react";
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
  confirmed: "#0f93a2",
  "in-progress": "#0891b2",
  done: "#10b981",
  cancelled: "#ef4444",
  "no-show": "#9ca3af",
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-cyan-50 text-cyan-700 border-cyan-200",
  "in-progress": "bg-sky-50 text-sky-700 border-sky-200",
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
  const isOnline = useOnlineStatus();
  const calendarRef = useRef<FullCalendar>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsPhone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
    if (!isOnline) { toast.error("You're offline. Connect to update appointments."); return; }
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
      <div className="fullcalendar-wrapper rounded-[28px] border border-border/50 bg-background/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isPhone ? "listWeek" : "timeGridWeek"}
          headerToolbar={{
            left: isPhone ? "prev,next" : "prev,next today",
            center: "title",
            right: isPhone ? "listWeek,timeGridDay,dayGridMonth" : "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
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

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
        >
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Appointments / Detail</p>
                <DialogTitle className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  {selected?.serviceName ?? selected?.customerName}
                </DialogTitle>
                <DialogDescription className="mt-1">{selected?.customerName}</DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-1 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          {selected && (
            <>
            <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <StatusPill status={selected.status} />
              </div>

              <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-muted/35">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {format(new Date(selected.startAt), "MMM d, yyyy · h:mm a")}
                    {" – "}
                    {format(new Date(selected.endAt), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{selected.customerName}</p>
                    {selected.customerPhone && (
                      <p className="text-xs text-muted-foreground">{selected.customerPhone}</p>
                    )}
                    {selected.customerEmail && (
                      <p className="text-xs text-muted-foreground">{selected.customerEmail}</p>
                    )}
                  </div>
                </div>
                {selected.serviceName && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-foreground">{selected.serviceName}</span>
                  </div>
                )}
                {selected.employeeName && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm text-foreground">{selected.employeeName}</span>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="rounded-2xl border border-border/60 bg-muted/35 px-3 py-2.5">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground/80">{selected.notes}</p>
                </div>
              )}
            </div>
            {(selected.status === "pending" || selected.status === "confirmed" || selected.status === "in-progress") && (
              <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:justify-end">
                <Button
                  size="sm"
                  className="rounded-full"
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
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={loading} className="rounded-full" />}>
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
              </DialogFooter>
            )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
