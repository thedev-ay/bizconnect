"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Clock, X } from "lucide-react";
import { AddShiftDialog } from "./add-shift-dialog";
import { deleteShift } from "../actions";
import type { Shift, StaffEmployee } from "../types";

interface StaffCalendarProps {
  shifts: Shift[];
  employees: StaffEmployee[];
  tenantSlug: string;
  tenantId: string;
}

// Distinct colors per employee index
const EMPLOYEE_COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#84cc16", // lime
];

function toLocalDatetimeString(date: Date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function StaffCalendar({ shifts, employees, tenantSlug, tenantId }: StaffCalendarProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Shift | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<string>("");
  const [defaultEnd, setDefaultEnd] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  // Map employee id → color
  const employeeColorMap = new Map<string, string>(
    employees.map((emp, i) => [emp.id, EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]])
  );

  const events = shifts.map((shift) => ({
    id: shift.id,
    title: shift.title
      ? `${shift.employeeName}: ${shift.title}`
      : shift.employeeName,
    start: new Date(shift.startAt),
    end: new Date(shift.endAt),
    backgroundColor: employeeColorMap.get(shift.employeeId) ?? "#6b7280",
    borderColor: employeeColorMap.get(shift.employeeId) ?? "#6b7280",
    extendedProps: { shift },
  }));

  function handleEventClick(info: EventClickArg) {
    setSelected(info.event.extendedProps.shift as Shift);
  }

  function handleDateSelect(info: DateSelectArg) {
    setDefaultStart(toLocalDatetimeString(info.start));
    setDefaultEnd(toLocalDatetimeString(info.end));
    setAddDialogOpen(true);
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteShift(tenantSlug, tenantId, selected.id);
      toast.success("Shift removed");
      setSelected(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete shift");
    } finally {
      setDeleting(false);
    }
  }

  // Legend
  const legend = employees.slice(0, 10).map((emp, i) => ({
    name: emp.name,
    color: EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length],
  }));

  return (
    <>
      {/* Employee color legend */}
      {legend.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {legend.map((l) => (
            <div key={l.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              {l.name}
            </div>
          ))}
        </div>
      )}

      <FullCalendar
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
        selectable
        selectMirror
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDisplay="block"
        dayMaxEvents={4}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        nowIndicator
        allDaySlot={false}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
      />

      {/* Shift detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex max-w-sm flex-col gap-0 overflow-hidden border border-border/70 bg-popover p-0 shadow-[0_0_60px_-20px_rgba(15,23,42,0.28)]"
        >
          <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">HR / Detail</p>
                <DialogTitle className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Shift details
                </DialogTitle>
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
              <div className="space-y-3 px-6 py-5">
                <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: employeeColorMap.get(selected.employeeId) }}
                />
                <span className="font-medium">{selected.employeeName}</span>
                </div>

                {selected.title && (
                  <p className="text-sm text-muted-foreground">{selected.title}</p>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(selected.startAt), "MMM d, yyyy · h:mm a")} –{" "}
                      {format(new Date(selected.endAt), "h:mm a")}
                    </span>
                  </div>
                </div>

                {selected.notes && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm">{selected.notes}</p>
                )}
              </div>

              <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 rounded-b-[inherit] border-t border-border/60 bg-muted/30 px-6 py-4 sm:justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {deleting ? "Removing..." : "Remove Shift"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add shift dialog */}
      <AddShiftDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tenantSlug={tenantSlug}
        tenantId={tenantId}
        employees={employees}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </>
  );
}
